import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package, Search, ShoppingBag, Truck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const PENDING_ORDER_HISTORY_EMAIL = "plugged_order_history_email";
const GUEST_ORDER_ACCESS_TOKEN = "plugged_guest_order_access_token";

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
    return "Too many link requests were made recently. Wait 15 minutes and try again.";
  }
  if (/not configured/i.test(message)) {
    return "Secure order-history email is not set up yet. Please contact the store for help.";
  }
  if (/failed to send a request to the edge function|function not found|404/i.test(message)) {
    return "Secure order history is not available yet. Please try again later or contact the store for help.";
  }
  return message || "Could not send the secure order-history link. Please try again later.";
}

export default function MyOrders() {
  const [email, setEmail] = useState(() => sessionStorage.getItem(PENDING_ORDER_HISTORY_EMAIL) || "");
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem(GUEST_ORDER_ACCESS_TOKEN) || "");
  const [linkSent, setLinkSent] = useState(() => Boolean(sessionStorage.getItem(PENDING_ORDER_HISTORY_EMAIL)) && !sessionStorage.getItem(GUEST_ORDER_ACCESS_TOKEN));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (token) => {
    const { data, error: invokeError } = await supabase.functions.invoke("customer-orders", {
      body: { token },
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
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const tokenFromLink = new URLSearchParams(hash).get("guest_order_token");
    if (tokenFromLink && /^[A-Za-z0-9_-]{43}$/.test(tokenFromLink)) {
      sessionStorage.setItem(GUEST_ORDER_ACCESS_TOKEN, tokenFromLink);
      setAccessToken(tokenFromLink);
    } else if (tokenFromLink) {
      setError("That secure link is invalid or expired. Request a new one below.");
    }
    if (hash.includes("guest_order_token")) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setLinkSent(false);
    loadOrders(accessToken)
      .catch((lookupError) => {
        if (!active) return;
        sessionStorage.removeItem(GUEST_ORDER_ACCESS_TOKEN);
        setAccessToken("");
        setError(lookupError.message || "Could not find your orders. Request a new secure link and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [accessToken, loadOrders]);

  async function requestOrderAccessLink(emailToRequest) {
    setLoading(true);
    setError("");
    setOrders([]);
    setSearched(false);
    const normalizedEmail = normalizeEmail(emailToRequest);

    try {
      const { data, error: requestError } = await supabase.functions.invoke("request-guest-orders-link", {
        body: { email: normalizedEmail },
      });
      if (requestError) {
        const response = requestError.context;
        let serverMessage = "";
        if (response && typeof response.json === "function") {
          try {
            const body = await response.clone().json();
            serverMessage = body?.error || "";
          } catch {
            // Fall back to the Supabase function error when the response isn't JSON.
          }
        }
        if (serverMessage) throw new Error(serverMessage);
        throw requestError;
      }
      if (!data?.success) throw new Error(data?.error || "Could not send the secure order-history link.");
      sessionStorage.setItem(PENDING_ORDER_HISTORY_EMAIL, normalizedEmail);
      setLinkSent(true);
    } catch (lookupError) {
      setError(orderAccessError(lookupError));
    } finally {
      setLoading(false);
    }
  }

  function sendOrderAccessLink(event) {
    event.preventDefault();
    void requestOrderAccessLink(email);
  }

  function changeEmail() {
    sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL);
    sessionStorage.removeItem(GUEST_ORDER_ACCESS_TOKEN);
    setAccessToken("");
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
        {!accessToken && !linkSent ? (
          <form onSubmit={sendOrderAccessLink} className="border border-border bg-white p-5 sm:p-7">
            <label htmlFor="order-history-email" className="mb-2 block text-sm font-semibold text-carbon">Checkout email address</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input id="order-history-email" name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => { sessionStorage.removeItem(PENDING_ORDER_HISTORY_EMAIL); setEmail(event.target.value); setOrders([]); setSearched(false); setError(""); }} placeholder="you@example.com" className="min-w-0 flex-1 rounded-md border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink" />
              <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 bg-carbon px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink disabled:opacity-50">
                <Search className="h-4 w-4" />{loading ? "Sending secure link…" : "Email Me a Secure Link"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Email is the only thing you enter here. We’ll send a one-tap secure link to verify it before showing your orders; no customer account, password, or order number is needed.</p>
          </form>
        ) : !accessToken && linkSent ? (
          <div role="status" className="border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
            <h2 className="font-heading text-lg font-bold text-carbon">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Check <span className="font-semibold text-carbon">{email}</span> for a one-tap secure link. It expires in 15 minutes; after opening it, any guest orders for that email will appear.</p>
            <button type="button" onClick={() => void requestOrderAccessLink(email)} disabled={loading} className="mt-4 mr-5 text-sm font-semibold text-pink transition-colors hover:text-carbon disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Sending…" : "Resend secure link"}</button>
            <button type="button" onClick={changeEmail} className="mt-4 text-sm font-semibold text-pink transition-colors hover:text-carbon">Use a different email</button>
          </div>
        ) : loading ? (
          <div role="status" className="border border-border p-6 text-center text-sm text-muted-foreground">Loading your secure order history…</div>
        ) : null}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-bold text-carbon">Your orders ({orders.length})</h2>
              <button type="button" onClick={changeEmail} className="text-sm font-semibold text-pink transition-colors hover:text-carbon">Use a different email</button>
            </div>
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
