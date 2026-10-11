// =====================================================================
//  verify-paystack  —  called by the browser after the Paystack popup
//  reports success. It NEVER trusts the browser:
//    1. asks Paystack (with the SECRET key) what really happened,
//    2. hands Paystack's answer to the database function
//       confirm_paystack_order(), which re-checks status, currency and the
//       exact amount against the order total, marks the order paid and
//       deducts stock exactly once.
//
//  Secrets (Supabase -> Edge Functions -> Secrets):
//    PAYSTACK_SECRET_KEY            sk_test_... / sk_live_...   (you add this)
//    SUPABASE_URL                   (provided automatically)
//    SUPABASE_SERVICE_ROLE_KEY      (provided automatically)
//
//  Deploy with "Verify JWT" turned OFF (the browser sends a publishable key).
// =====================================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://pluggedbyayeley.com",
  "https://www.pluggedbyayeley.com",
  "https://plugged-by-ayeley.onrender.com",
  // Add any other address (custom domain, etc.) on a new line here.
]);

function corsFor(req: Request) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

Deno.serve(async (req) => {
  const headers = corsFor(req);
  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Forbidden." }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!secretKey || !supabaseUrl || !serviceRoleKey) {
    console.error("verify-paystack: missing secrets");
    return json({ error: "Payment verification is not configured yet." }, 500);
  }

  let reference = "";
  try {
    const body = await req.json();
    reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) {
    return json({ error: "Invalid payment reference." }, 400);
  }

  // 1. Ask Paystack what really happened.
  let paystack: any;
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    paystack = await res.json();
    if (!res.ok || !paystack?.status || !paystack?.data) {
      console.error("verify-paystack: Paystack said no", res.status, paystack?.message);
      return json({ error: "Paystack could not confirm this payment yet." }, 502);
    }
  } catch (err) {
    console.error("verify-paystack: Paystack request failed", err);
    return json({ error: "Could not reach Paystack. Please try again." }, 502);
  }

  const data = paystack.data;

  // 2. Let the database decide (amount, currency, status, duplicates, stock).
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: result, error } = await supabase.rpc("confirm_paystack_order", {
    p_reference: reference,
    p_amount_minor: data.amount,
    p_currency: data.currency,
    p_gateway_status: data.status,
    // Only non-sensitive fields are stored (no card details).
    p_metadata: {
      paystack_transaction_id: data.id,
      channel: data.channel,
      paid_at: data.paid_at,
      gateway_response: data.gateway_response,
      fees: data.fees,
    },
  });

  if (error) {
    console.error("verify-paystack: confirm_paystack_order failed", error);
    return json({ error: "We could not confirm your order. Please contact us with your order number." }, 500);
  }

  return json({ ...(result ?? {}) });
});

