import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Package, Search, ShoppingBag, Truck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const ORDER_HISTORY_EMAIL = "plugged_order_history_email";

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

function orderLookupError(error) {
  const message = error?.message || "";
  if (/rate limit|too many requests/i.test(message)) {
    return "Too many order lookups were made recently. Wait 15 minutes and try again.";
  }
  if (/failed to send a request to the edge function|function not found|404/i.test(message)) {
    return "Order history is temporarily unavailable. Please try again later.";
  }
  return message || "Could not load your orders. Please try again later.";
}

export default function MyOrders() {
  const [email, setEmail] = useState(() => sessionStorage.getItem(ORDER_HISTORY_EMAIL) || "");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (emailToLookup) => {
    const { data, error: invokeError } = await supabase.functions.invoke("customer-orders", {
      body: { email: emailToLookup },
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

  async function findOrders(event) {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    setLoading(true);
    setError("");
    setOrders([]);
    setSearched(false);

    try {
      await loadOrders(normalizedEmail);
      setEmail(normalizedEmail);
      sessionStorage.setItem(ORDER_HISTORY_EMAIL, normalizedEmail);
    } catch (lookupError) {
      setError(orderLookupError(lookupError));
    } finally {
      setLoading(false);
    }
  }

  function changeEmail() {
    sessionStorage.removeItem(ORDER_HISTORY_EMAIL);
    setEmail("");
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
          <p className="mx-auto max-w-lg text-sm text-white/65">Enter the email address you used at checkout to see your orders.</p>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <form onSubmit={findOrders} className="border border-border bg-white p-5 sm:p-7">
          <label htmlFor="order-history-email" className="mb-2 block text-sm font-semibold text-carbon">Checkout email address</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="order-history-email" name="email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => { sessionStorage.removeItem(ORDER_HISTORY_EMAIL); setEmail(event.target.value); setOrders([]); setSearched(false); setError(""); }} placeholder="you@example.com" className="min-w-0 flex-1 rounded-md border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink" />
            <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 bg-carbon px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink disabled:cursor-not-allowed disabled:opacity-50">
              <Search className="h-4 w-4" />{loading ? "Finding orders…" : "Find My Orders"}
            </button>
          </div>
        </form>

        {loading && <div role="status" className="mt-5 border border-border p-6 text-center text-sm text-muted-foreground">Loading your order history…</div>}
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
