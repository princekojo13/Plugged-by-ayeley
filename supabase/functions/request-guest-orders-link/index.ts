import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
const GENERIC_MESSAGE = "If you can access that inbox, a secure order-history link will arrive shortly.";

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

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = headersFor(origin);
  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Forbidden origin." }, 403, headers);
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") return respond({ success: false, error: "Method not allowed." }, 405, headers);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return respond({ success: false, error: "Forbidden origin." }, 403, headers);

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > 4096) return respond({ success: false, error: "Request is too large." }, 413, headers);
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return respond({ success: false, error: "Enter the checkout email address." }, 400, headers);
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond({ success: false, error: "Enter the email address used at checkout." }, 400, headers);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("ORDER_HISTORY_FROM");
    if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !from || /[\r\n]/.test(from)) {
      console.error("request-guest-orders-link: mail or database configuration is missing.");
      return respond({ success: false, error: "Secure order-history email is not configured yet. Please contact the store." }, 503, headers);
    }

    const forwardedIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKeys = [
      `email:${await sha256Hex(email)}`,
      `ip:${await sha256Hex(forwardedIp)}`,
    ];
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: rateError } = await admin.rpc("consume_customer_order_lookup", {
      p_keys: rateKeys,
      p_max_attempts: 3,
      p_window_seconds: 900,
    });
    if (rateError) {
      console.error("request-guest-orders-link: rate limit check failed.", rateError.message);
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }
    if (allowed !== true) {
      return respond({ success: false, error: "Too many link requests. Please wait 15 minutes and try again." }, 429, headers);
    }

    const token = createAccessToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Remove only already-expired records. A newer request must not invalidate
    // another valid link that was delivered to the same customer's inbox.
    const { error: cleanupError } = await admin
      .from("guest_order_access_tokens")
      .delete()
      .lte("expires_at", new Date().toISOString());
    if (cleanupError) {
      console.error("request-guest-orders-link: expired-token cleanup failed.", cleanupError.message);
    }

    const { error: tokenError } = await admin
      .from("guest_order_access_tokens")
      .insert({ email, token_hash: tokenHash, expires_at: expiresAt });
    if (tokenError) {
      console.error("request-guest-orders-link: token storage failed.", tokenError.message);
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }

    const accessUrl = `${origin}/my-orders#guest_order_token=${token}`;
    const message = [
      "We received a request to view Plugged by Ayeley order history.",
      "Open this secure link to view any orders associated with this email (it expires in 15 minutes):",
      accessUrl,
      "If you did not request this link, you can ignore this email.",
    ].join("\n\n");
    const html = `<p>We received a request to view Plugged by Ayeley order history.</p><p><a href="${accessUrl}">Open your secure order-history link</a></p><p>This link expires in 15 minutes. If you did not request it, you can ignore this email.</p>`;

    try {
      const delivery = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Your Plugged by Ayeley order-history link",
          text: message,
          html,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!delivery.ok) {
        await admin.from("guest_order_access_tokens").delete().eq("token_hash", tokenHash);
        console.error("request-guest-orders-link: email provider rejected a message.", delivery.status);
        return respond({ success: false, error: "The email could not be delivered right now. Please try again shortly." }, 502, headers);
      }
    } catch (deliveryError) {
      await admin.from("guest_order_access_tokens").delete().eq("token_hash", tokenHash);
      console.error("request-guest-orders-link: email delivery failed.", deliveryError instanceof Error ? deliveryError.message : "Unknown error");
      return respond({ success: false, error: "The email could not be delivered right now. Please try again shortly." }, 503, headers);
    }

    return respond({ success: true, message: GENERIC_MESSAGE }, 202, headers);
  } catch (error) {
    console.error("request-guest-orders-link: unexpected error.", error instanceof Error ? error.message : "Unknown error");
    return respond({ success: false, error: "Order history is temporarily unavailable." }, 500, headers);
  }
});
