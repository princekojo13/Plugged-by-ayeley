import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package, Search, ShoppingBag, Truck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const PENDING_ORDER_HISTORY_EMAIL = "plugged_order_history_email";

function money(value) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function orderAccessError(error) {
  const message = error?.message || "";
  if (/rate limit|too many requests/i.test(message)) {
    return "Too many sign-in emails were requested recently. Wait before trying again, or configure custom SMTP in Supabase Authentication → Emails → SMTP Settings for reliable email delivery.";
  }
  return message || "Could not send the secure sign-in link. Please try again later.";
}

export default function MyOrders() {
  const [email, setEmail] = useState(() => sessionStorage.getItem(PENDING_ORDER_HISTORY_EMAIL) || "");
  const [linkSent, setLinkSent] = useState(() => Boolean(sessionStorage.getItem(PENDING_ORDER_HISTORY_EMAIL)));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (normalizedEmail) => {
    const { data, error: invokeError } = await supabase.functions.invoke("customer-orders", {
      body: { email: normalizedEmail },
    });
    if (invokeError) {
      const response = invokeError.context;
      let serverMessage = "";
      if (response && typeof response.json === "function") {
        try {
          const body = await response.clone().json();
          serverMessage = body?.error || "";
        } catch {
          // Use the SDK error message when the function response isn't JSON.
        }
      }
      if (serverMessage) throw new Error(serverMessage);
      throw invokeError;
    }
    if (!data?.success) throw new Error(data?.error || "Order history is temporarily unavailable.");
    setOrders(Array.isArray(data.orders) ? data.orders : []);
    setSearched(true);
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreVerifiedOrderLookup() {
      const pendingEmail = normalizeEmail(sessionStorage.getItem(PENDING_ORDER_HISTORY_EMAIL) || "");
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!active || userError || !user?.email_confirmed_at || !user.email) return;
        const verifiedEmail = normalizeEmail(user.email);
        if (pendingEmail && pendingEmail !== verifiedEmail) return;
        setEmail(verifiedEmail);
        setLoading(true);
        setError("");
        setLinkSent(false);
        await loadOrders(verifiedEmail);
        sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL);
      } catch (lookupError) {
        if (active) setError(lookupError.message || "Could not find your orders. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void restoreVerifiedOrderLookup();
    return () => { active = false; };
  }, [loadOrders]);

  async function sendOrderAccessLink(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrders([]);
    setSearched(false);
    const normalizedEmail = normalizeEmail(email);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user?.email_confirmed_at && normalizeEmail(user.email || "") === normalizedEmail) {
        await loadOrders(normalizedEmail);
        sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL);
        return;
      }

      sessionStorage.setItem(PENDING_ORDER_HISTORY_EMAIL, normalizedEmail);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/my-orders`,
        },
      });
      if (otpError) throw otpError;
      setLinkSent(true);
    } catch (lookupError) {
      setError(orderAccessError(lookupError));
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL);
    setLinkSent(false);
    setOrders([]);
    setSearched(false);
    setError("");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-carbon py-14 text-white">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <Package className="mx-auto mb-5 h-12 w-12 text-pink" />
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-pink">Order history</p>
          <h1 className="mb-3 font-heading text-3xl font-bold sm:text-4xl">My Orders</h1>
          <p className="mx-auto max-w-lg text-sm text-white/65">Enter the email address you used at checkout. We’ll send a secure link so only you can open your order history.</p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        {!linkSent ? (
          <form onSubmit={sendOrderAccessLink} className="border border-border bg-white p-5 sm:p-7">
            <label htmlFor="order-history-email" className="mb-2 block text-sm font-semibold text-carbon">Checkout email address</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input id="order-history-email" name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => { sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL); setEmail(event.target.value); setOrders([]); setSearched(false); setError(""); }} placeholder="you@example.com" className="min-w-0 flex-1 rounded-md border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink" />
              <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 bg-carbon px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink disabled:opacity-50">
                <Search className="h-4 w-4" />{loading ? "Sending secure link…" : "Email Me a Secure Link"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">We’ll email you a one-tap sign-in link. Open it to see your orders; you won’t need to enter a code.</p>
          </form>
        ) : (
          <div role="status" className="border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
            <h2 className="font-heading text-lg font-bold text-carbon">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">We sent a secure sign-in link to <span className="font-semibold text-carbon">{email}</span>. Open it to return here and view your order history. No code entry is needed.</p>
            <button type="button" onClick={changeEmail} className="mt-4 text-sm font-semibold text-pink transition-colors hover:text-carbon">Use a different email</button>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {searched && orders.length === 0 && !error && (
          <div className="mt-6 border border-border p-8 text-center">
            <Package className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
            <h2 className="font-heading text-xl font-bold text-carbon">No orders found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Check that you entered the same email address used at checkout.</p>
          </div>
        )}

        {orders.length > 0 && (
          <section className="mt-8 space-y-4" aria-label="Your order history">
            <h2 className="font-heading text-xl font-bold text-carbon">Your orders ({orders.length})</h2>
            {orders.map((order) => (
              <article key={order.order_number} className="border border-border p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-carbon">{order.order_number}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg font-bold text-carbon">{money(order.total)}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{String(order.order_status || "pending").replaceAll("_", " ")}</p>
                  </div>
                </div>
                {order.items?.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order details</p>
                    <ul className="space-y-1.5 text-sm text-carbon">
                      {order.items.map((item, index) => <li key={`${order.order_number}-${index}`} className="flex justify-between gap-4"><span>{item.quantity} × {item.name}</span><span className="shrink-0">{money(item.line_total)}</span></li>)}
                    </ul>
                    <p className="mt-3 border-t border-border pt-3 text-right text-sm font-bold text-carbon">Total {money(order.total)}</p>
                  </div>
                )}
                <Link to={`/track-order?order=${encodeURIComponent(order.order_number)}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-carbon px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink sm:w-auto">
                  <Truck className="h-4 w-4" />Track this order<ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </section>
        )}

        <div className="mt-8 text-center">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pink transition-colors hover:text-carbon"><ShoppingBag className="h-4 w-4" />Continue Shopping</Link>
        </div>
      </main>
    </div>
  );
}
