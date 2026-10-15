import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(body: Uint8Array, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, body);
  return safeEqual(toHex(new Uint8Array(digest)), signature.toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ received: false, error: "Method not allowed." }, 405);

  const paystackSecret = Deno.env.get("paystack_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!paystackSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("paystack webhook configuration is missing.");
    return json({ received: false, error: "Server configuration error." }, 500);
  }

  const rawBody = new Uint8Array(await req.arrayBuffer());
  if (rawBody.length > 1_000_000) return json({ received: false, error: "Request too large." }, 413);

  const signature = req.headers.get("x-paystack-signature") || "";
  if (!signature || !(await verifySignature(rawBody, signature, paystackSecret))) {
    return json({ received: false, error: "Invalid paystack signature." }, 401);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ received: false, error: "Invalid event body." }, 400);
  }

  if (event.event !== "charge.success") return json({ received: true, ignored: true });
  const eventData = event.data && typeof event.data === "object"
    ? event.data as Record<string, unknown>
    : {};
  const reference = typeof eventData.reference === "string" ? eventData.reference.trim() : "";
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) {
    return json({ received: false, error: "Invalid transaction reference." }, 400);
  }

  let transaction: Record<string, unknown>;
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paystackSecret}` },
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result?.status !== true || !result?.data) {
      console.error("paystack webhook transaction verification failed.");
      return json({ received: false, error: "Transaction verification failed." }, 502);
    }
    transaction = result.data;
  } catch (error) {
    console.error("paystack webhook could not reach paystack:", error);
    return json({ received: false, error: "Transaction verification is temporarily unavailable." }, 502);
  }

  if (transaction.reference !== reference) return json({ received: false, error: "Reference mismatch." }, 400);

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await db.rpc("confirm_paystack_order", {
    p_reference: reference,
    p_amount_minor: transaction.amount,
    p_currency: transaction.currency,
    p_gateway_status: transaction.status,
    p_metadata: {
      paystack_transaction_id: transaction.id,
      channel: transaction.channel,
      paid_at: transaction.paid_at,
      gateway_response: transaction.gateway_response,
      fees: transaction.fees,
    },
  });

  if (error) {
    console.error("paystack webhook could not confirm the order:", error.message);
    return json({ received: false, error: "Order confirmation failed." }, 500);
  }
  if (data?.ok !== true) {
    console.error("paystack event was received but the order needs review:", data?.reason || "unknown");
    return json({ received: true, confirmed: false, reason: data?.reason || "review_required" });
  }

  return json({ received: true, confirmed: true, order_number: data.order_number });
});
