import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_ORIGINS = new Set([
  "https://pluggedbyayeley.com",
  "https://www.pluggedbyayeley.com",
  "https://plugged-by-ayeley.onrender.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
]);

function headersFor(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function respond(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function readBoundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("request_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function readBoundedStream(stream: ReadableStream<Uint8Array> | null, maxBytes: number) {
  const reader = stream?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("stream_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function isAuthorizedAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !supabaseUrl || !serviceRoleKey) return false;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return false;

  const { data: staff, error: roleError } = await admin
    .from("admin_users")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  return staff?.role === "admin";
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const headers = headersFor(origin);

  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Forbidden origin." }, 403, headers);
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405, headers);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Forbidden origin." }, 403, headers);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
    return respond({ error: "Upload one supported product image." }, 415, headers);
  }

  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    return respond({ error: "Product photos must be 5 MB or smaller." }, 413, headers);
  }

  try {
    if (!await isAuthorizedAdmin(request)) {
      return respond({ error: "Administrator access is required." }, 403, headers);
    }
  } catch (error) {
    console.error("remove-product-background: admin authorization check failed.", error instanceof Error ? error.message : "Unknown error");
    return respond({ error: "Admin access could not be verified. Sign in again and retry." }, 503, headers);
  }

  const apiKey = Deno.env.get("REMOVE_BG_API_KEY");
  if (!apiKey) {
    return respond({ error: "Background removal is not configured yet. Add REMOVE_BG_API_KEY in Supabase Edge Function secrets." }, 503, headers);
  }

  try {
    let bodyBytes: Uint8Array;
    try {
      bodyBytes = await readBoundedBody(request);
    } catch (error) {
      if (error instanceof Error && error.message === "request_too_large") {
        return respond({ error: "Product photos must be 5 MB or smaller." }, 413, headers);
      }
      throw error;
    }

    const contentType = request.headers.get("content-type") || "";
    const formRequest = new Request("https://photo-studio.local/upload", {
      method: "POST",
      headers: { "content-type": contentType },
      body: bodyBytes,
    });
    const form = await formRequest.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return respond({ error: "Choose an image file to process." }, 400, headers);
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      return respond({ error: "Product photos must be between 1 byte and 5 MB." }, 413, headers);
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return respond({ error: "Choose a JPEG, PNG, or WebP image. AVIF photos are converted in the admin browser before upload." }, 415, headers);
    }

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidImageSignature(file.type, imageBytes)) {
      return respond({ error: "The uploaded file does not match its image type." }, 415, headers);
    }

    const providerForm = new FormData();
    providerForm.append("image_file", new File([imageBytes], "product-image", { type: file.type }));
    providerForm.append("size", "auto");
    providerForm.append("format", "png");

    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: providerForm,
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      console.error("remove-product-background: provider request failed.", error instanceof Error ? error.message : "Unknown error");
      return respond({ error: "The image service could not be reached. Try again in a moment." }, 503, headers);
    }

    if (!providerResponse.ok) {
      if (providerResponse.status === 402 || providerResponse.status === 403) {
        return respond({ error: "The background-removal API key is invalid or its available credits are exhausted." }, 502, headers);
      }
      if (providerResponse.status === 429) {
        return respond({ error: "The background-removal service is rate limited. Wait a moment and retry." }, 429, headers);
      }
      if (providerResponse.status === 400 || providerResponse.status === 415) {
        return respond({ error: "The image service could not process this file. Try a JPEG or PNG photo under 5 MB." }, 422, headers);
      }
      console.error("remove-product-background: provider returned HTTP", providerResponse.status);
      return respond({ error: "The image service failed to remove the background. Your original photo is unchanged." }, 502, headers);
    }

    let result: Uint8Array;
    try {
      result = await readBoundedStream(providerResponse.body, 20 * 1024 * 1024);
    } catch (error) {
      if (error instanceof Error && error.message === "stream_too_large") {
        return respond({ error: "The image service returned a result that is too large. Your original photo is unchanged." }, 502, headers);
      }
      throw error;
    }
    const isPng = result.length >= 8
      && result[0] === 0x89
      && result[1] === 0x50
      && result[2] === 0x4e
      && result[3] === 0x47;
    if (!isPng || result.length > 20 * 1024 * 1024) {
      return respond({ error: "The image service returned an unsupported result. Your original photo is unchanged." }, 502, headers);
    }

    return new Response(result, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Length": String(result.byteLength),
      },
    });
  } catch (error) {
    console.error("remove-product-background: processing failed.", error instanceof Error ? error.message : "Unknown error");
    return respond({ error: "Background removal failed. Your original photo is unchanged." }, 500, headers);
  }
});
