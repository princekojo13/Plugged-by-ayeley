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

function headersFor(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = headersFor(origin);
  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Forbidden origin." }, 403, headers);
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") return respond({ success: false, error: "Method not allowed." }, 405, headers);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ success: false, error: "Forbidden origin." }, 403, headers);

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > 4096) return respond({ success: false, error: "Request is too large." }, 413, headers);
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return respond({ success: false, error: "The secure access link is invalid or expired." }, 400, headers);
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return respond({ success: false, error: "The secure access link is invalid or expired." }, 401, headers);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("customer-orders: server configuration is missing.");
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }

    const forwardedIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const tokenHash = await sha256Hex(token);
    const rateKeys = [
      `token:${tokenHash}`,
      `ip:${await sha256Hex(forwardedIp)}`,
    ];
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: rateError } = await admin.rpc("consume_customer_order_lookup", {
      p_keys: rateKeys,
      p_max_attempts: 8,
      p_window_seconds: 900,
    });
    if (rateError) {
      console.error("customer-orders: rate limit check failed.", rateError.message);
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }
    if (allowed !== true) {
      return respond({ success: false, error: "Too many attempts. Please wait 15 minutes and try again." }, 429, headers);
    }

    const { data: access, error: accessError } = await admin
      .from("guest_order_access_tokens")
      .select("email")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (accessError) {
      console.error("customer-orders: access token lookup failed.", accessError.message);
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }
    if (!access?.email) {
      return respond({ success: false, error: "The secure access link is invalid or expired." }, 401, headers);
    }

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("order_number,order_status,payment_status,payment_method,created_at,subtotal,delivery_fee,total,order_items(product_name_snapshot,product_price_snapshot,quantity,line_total)")
      .eq("customer_email", access.email)
      .order("created_at", { ascending: false })
      .limit(50);
    if (ordersError) {
      console.error("customer-orders: order query failed.", ordersError.message);
      return respond({ success: false, error: "Order history is temporarily unavailable." }, 503, headers);
    }

    const safeOrders = (orders || []).map((order) => ({
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      created_at: order.created_at,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total: order.total,
      currency: "GHS",
      items: (order.order_items || []).map((item: Record<string, unknown>) => ({
        name: item.product_name_snapshot,
        price: item.product_price_snapshot,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
    }));

    return respond({ success: true, orders: safeOrders }, 200, headers);
  } catch (error) {
    console.error("customer-orders: unexpected error.", error instanceof Error ? error.message : "Unknown error");
    return respond({ success: false, error: "Order history is temporarily unavailable." }, 500, headers);
  }
});
