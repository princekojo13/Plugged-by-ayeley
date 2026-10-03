import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Loader2,
  Package,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Cancelled",
];

function formatGhs(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  switch (status) {
    case "Delivered":
      return "bg-emerald-50 text-emerald-700";
    case "Cancelled":
      return "bg-red-50 text-red-700";
    case "Out for delivery":
      return "bg-purple-50 text-purple-700";
    case "Shipped":
      return "bg-blue-50 text-blue-700";
    case "Processing":
      return "bg-cyan-50 text-cyan-700";
    case "Confirmed":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-[#fff0f7] text-[#e60078]";
  }
}

function paymentClass(status) {
  switch (status) {
    case "paid":
      return "text-emerald-700";
    case "failed":
    case "cancelled":
      return "text-red-700";
    default:
      return "text-amber-700";
  }
}

function getItemSubtotal(order) {
  return (order.order_items || []).reduce(
    (sum, item) =>
      sum +
      Number(item.unit_price || 0) *
        Number(item.quantity || 0),
    0
  );
}

function getCalculatedTotal(order) {
  return (
    getItemSubtotal(order) +
    Number(order.delivery_fee || 0)
  );
}

function totalsMatch(order) {
  const storedTotal = Number(order.total || 0);
  const calculatedTotal = getCalculatedTotal(order);

  return Math.abs(storedTotal - calculatedTotal) < 0.01;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          full_name,
          email,
          phone,
          delivery_address,
          city,
          delivery_region,
          delivery_fee,
          subtotal,
          total,
          payment_method,
          payment_status,
          payment_reference,
          status,
          order_note,
          momo_number,
          momo_network,
          tracking_token,
          created_at,
          updated_at,
          order_items (
            id,
            product_id,
            product_name,
            unit_price,
            quantity,
            line_total,
            created_at
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      const normalized = (data || []).map((order) => ({
        ...order,
        order_items: order.order_items || [],
      }));

      setOrders(normalized);
    } catch (err) {
      console.error("Failed to load orders:", err);

      setOrders([]);
      setError(
        err?.message || "Could not load orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const updateOrderStatus = async (order, status) => {
    if (updating === order.id || status === order.status) {
      return;
    }

    setUpdating(order.id);
    setError("");

    try {
      const updatedAt = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: updatedAt,
        })
        .eq("id", order.id)
        .select(
          "id, status, updated_at"
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: data.status,
                updated_at: data.updated_at,
              }
            : item
        )
      );

      setSelectedOrder((current) =>
        current?.id === order.id
          ? {
              ...current,
              status: data.status,
              updated_at: data.updated_at,
            }
          : current
      );
    } catch (err) {
      console.error(
        "Failed to update order status:",
        err
      );

      setError(
        err?.message ||
          "Could not update the order status."
      );
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return orders;
    }

    return orders.filter((order) =>
      [
        order.order_number,
        order.full_name,
        order.email,
        order.phone,
        order.city,
        order.delivery_region,
      ]
        .filter(Boolean)
        .some((field) =>
          String(field)
            .toLowerCase()
            .includes(value)
        )
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    const total = orders.length;

    const pending = orders.filter(
      (order) => order.status === "Pending"
    ).length;

    const processing = orders.filter(
      (order) =>
        order.status === "Confirmed" ||
        order.status === "Processing" ||
        order.status === "Shipped" ||
        order.status === "Out for delivery"
    ).length;

    const delivered = orders.filter(
      (order) => order.status === "Delivered"
    ).length;

    const orderValue = orders
      .filter((order) => order.status !== "Cancelled")
      .reduce(
        (sum, order) => {
          const totalFromDatabase =
            Number(order.total || 0);

          return sum + totalFromDatabase;
        },
        0
      );

    const paidValue = orders
      .filter(
        (order) =>
          order.payment_status === "paid" &&
          order.status !== "Cancelled"
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0
      );

    const mismatchedOrders = orders.filter(
      (order) => !totalsMatch(order)
    ).length;

    return {
      total,
      pending,
      processing,
      delivered,
      orderValue,
      paidValue,
      mismatchedOrders,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
                aria-label="Back to admin dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">
                  Admin
                </p>

                <h1 className="mt-1 font-heading text-2xl font-bold">
                  Orders
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  Manage customer orders and
                  delivery progress.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {stats.mismatchedOrders > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Order total discrepancy detected
              </p>

              <p className="mt-1 leading-6">
                {stats.mismatchedOrders === 1
                  ? "1 order"
                  : `${stats.mismatchedOrders} orders`}{" "}
                have a stored total that does not
                match the sum of their items plus
                delivery fee. Review those orders
                before treating the totals as reliable.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            label="Total Orders"
            value={stats.total}
            pink
          />

          <Stat
            label="Pending"
            value={stats.pending}
          />

          <Stat
            label="In Progress"
            value={stats.processing}
          />

          <Stat
            label="Delivered"
            value={stats.delivered}
          />

          <Stat
            label="Order Value"
            value={formatGhs(stats.orderValue)}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
              Paid Value
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatGhs(stats.paidValue)}
            </p>

            <p className="mt-2 text-xs text-black/40">
              Based only on orders currently marked paid.
            </p>
          </div>

          <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
              Data Check
            </p>

            <p
              className={`mt-2 text-2xl font-bold ${
                stats.mismatchedOrders > 0
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {stats.mismatchedOrders > 0
                ? `${stats.mismatchedOrders} issue${
                    stats.mismatchedOrders === 1
                      ? ""
                      : "s"
                  }`
                : "All clear"}
            </p>

            <p className="mt-2 text-xs text-black/40">
              Stored totals are compared with order
              items plus delivery fee.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order number, customer, email, phone or city..."
              className="w-full rounded-xl border border-black/10 bg-[#fafafa] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff1f8f] focus:bg-white"
            />
          </div>

          <div className="mt-4 border-t border-black/[0.06] pt-4 text-sm text-black/40">
            Showing{" "}
            <span className="font-semibold text-black">
              {filteredOrders.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-black">
              {orders.length}
            </span>{" "}
            orders
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#ff1f8f]" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]">
                <Package className="h-6 w-6" />
              </div>

              <h2 className="mt-5 font-heading text-xl font-bold">
                No orders found
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-black/40">
                Orders will appear here when
                customers place them.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {filteredOrders.map((order) => {
                const expanded =
                  selectedOrder?.id === order.id;

                const itemSubtotal =
                  getItemSubtotal(order);

                const calculatedTotal =
                  getCalculatedTotal(order);

                const storedTotal =
                  Number(order.total || 0);

                const hasMismatch =
                  !totalsMatch(order);

                return (
                  <div key={order.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(
                          expanded ? null : order
                        )
                      }
                      className="w-full px-5 py-5 text-left transition hover:bg-[#fff8fc] sm:px-6"
                      aria-expanded={expanded}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold">
                              #{order.order_number}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>

                            {hasMismatch && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Total mismatch
                              </span>
                            )}
                          </div>

                          <p className="mt-2 font-semibold">
                            {order.full_name}
                          </p>

                          <p className="mt-1 text-xs text-black/35">
                            {formatDate(
                              order.created_at
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">
                              {formatGhs(storedTotal)}
                            </p>

                            <p
                              className={`mt-1 text-xs capitalize font-semibold ${paymentClass(
                                order.payment_status
                              )}`}
                            >
                              {order.payment_status}
                            </p>
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0f7] text-[#ff1f8f]">
                            {expanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-black/[0.06] bg-[#fffdfd] px-5 py-6 sm:px-6">
                        <div className="grid gap-5 lg:grid-cols-3">
                          <InfoCard title="Customer">
                            <p className="font-semibold">
                              {order.full_name || "—"}
                            </p>

                            <p className="mt-1 text-sm text-black/50">
                              {order.phone || "—"}
                            </p>

                            <p className="mt-1 break-all text-sm text-black/50">
                              {order.email || "—"}
                            </p>
                          </InfoCard>

                          <InfoCard title="Delivery">
                            <p className="font-semibold">
                              {order.city || "—"}
                            </p>

                            {order.delivery_region && (
                              <p className="mt-1 text-sm text-black/50">
                                {order.delivery_region}
                              </p>
                            )}

                            <p className="mt-2 text-sm leading-6 text-black/50">
                              {order.delivery_address ||
                                "No address provided"}
                            </p>

                            {order.order_note && (
                              <p className="mt-2 text-sm text-black/50">
                                <strong className="text-black">
                                  Note:
                                </strong>{" "}
                                {order.order_note}
                              </p>
                            )}

                            {order.tracking_token && (
                              <p className="mt-3 break-all text-xs text-black/35">
                                Tracking token:{" "}
                                {order.tracking_token}
                              </p>
                            )}
                          </InfoCard>

                          <InfoCard title="Payment">
                            <p className="text-sm text-black/55">
                              Method:{" "}
                              <strong className="text-black">
                                {order.payment_method ===
                                "pay_on_delivery"
                                  ? "Pay on Delivery"
                                  : "Pay Online"}
                              </strong>
                            </p>

                            <p className="mt-2 text-sm text-black/55">
                              Status:{" "}
                              <strong
                                className={paymentClass(
                                  order.payment_status
                                )}
                              >
                                {order.payment_status}
                              </strong>
                            </p>

                            {order.momo_number && (
                              <p className="mt-2 text-sm text-black/50">
                                MoMo:{" "}
                                <strong className="text-black">
                                  {order.momo_number}
                                </strong>
                                {order.momo_network
                                  ? ` (${order.momo_network})`
                                  : ""}
                              </p>
                            )}

                            {order.payment_reference && (
                              <p className="mt-2 break-all text-sm text-black/45">
                                Reference:{" "}
                                {order.payment_reference}
                              </p>
                            )}

                            <p className="mt-3 text-xs text-black/35">
                              Payment status is controlled by
                              the verified payment flow, not by
                              a client-side dropdown.
                            </p>
                          </InfoCard>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-sm font-bold">
                            Order Items
                          </h3>

                          <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
                            {(order.order_items || []).length ===
                            0 ? (
                              <div className="px-4 py-6 text-sm text-black/45">
                                No order items found.
                              </div>
                            ) : (
                              (order.order_items || []).map(
                                (item) => {
                                  const calculatedLineTotal =
                                    Number(
                                      item.unit_price || 0
                                    ) *
                                    Number(
                                      item.quantity || 0
                                    );

                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-4 last:border-b-0"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-semibold">
                                          {item.product_name}
                                        </p>

                                        <p className="mt-1 text-xs text-black/40">
                                          {formatGhs(
                                            item.unit_price
                                          )}{" "}
                                          ×{" "}
                                          {item.quantity}
                                        </p>
                                      </div>

                                      <p className="shrink-0 font-semibold">
                                        {formatGhs(
                                          calculatedLineTotal
                                        )}
                                      </p>
                                    </div>
                                  );
                                }
                              )
                            )}

                            <div className="space-y-2 border-t border-black/[0.06] bg-[#fffdfd] px-4 py-4">
                              <div className="flex justify-between text-sm text-black/55">
                                <span>
                                  Items subtotal
                                </span>

                                <span>
                                  {formatGhs(
                                    itemSubtotal
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between text-sm text-black/55">
                                <span>
                                  Delivery fee
                                </span>

                                <span>
                                  {formatGhs(
                                    order.delivery_fee
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between border-t border-black/[0.06] pt-3">
                                <span className="font-semibold">
                                  Calculated total
                                </span>

                                <span className="font-bold text-[#e60078]">
                                  {formatGhs(
                                    calculatedTotal
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between">
                                <span className="font-semibold">
                                  Stored order total
                                </span>

                                <span
                                  className={`font-bold ${
                                    hasMismatch
                                      ? "text-amber-700"
                                      : "text-[#e60078]"
                                  }`}
                                >
                                  {formatGhs(
                                    storedTotal
                                  )}
                                </span>
                              </div>

                              {hasMismatch && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-800">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                  <span>
                                    The stored order total does
                                    not match the item subtotal
                                    plus delivery fee. This order
                                    should not be used as a trusted
                                    financial record until the
                                    underlying order data is checked.
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          <ControlCard label="Order Status">
                            <select
                              value={order.status}
                              onChange={(event) =>
                                updateOrderStatus(
                                  order,
                                  event.target.value
                                )
                              }
                              disabled={
                                updating === order.id
                              }
                              className="w-full appearance-auto rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#ff1f8f] focus:ring-2 focus:ring-[#ff1f8f]/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {STATUSES.map(
                                (status) => (
                                  <option
                                    key={status}
                                    value={status}
                                  >
                                    {status}
                                  </option>
                                )
                              )}
                            </select>
                          </ControlCard>

                          <ControlCard label="Payment Status">
                            <div className="flex min-h-[48px] items-center justify-between rounded-xl border border-black/10 bg-[#fafafa] px-4">
                              <span
                                className={`font-semibold capitalize ${paymentClass(
                                  order.payment_status
                                )}`}
                              >
                                {order.payment_status}
                              </span>

                              <span className="text-xs text-black/35">
                                Server controlled
                              </span>
                            </div>
                          </ControlCard>
                        </div>

                        {updating === order.id && (
                          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#e60078]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving changes...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  pink = false,
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <div
        className={`h-1.5 w-10 rounded-full ${
          pink
            ? "bg-[#ff1f8f]"
            : "bg-black/10"
        }`}
      />

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
        {title}
      </p>

      <div className="mt-3 text-sm leading-6 text-black/60">
        {children}
      </div>
    </div>
  );
}

function ControlCard({ label, children }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5">
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
        {label}
      </label>

      {children}
    </div>
  );
}