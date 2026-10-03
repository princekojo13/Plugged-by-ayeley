import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  MessageSquare,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
      return "bg-black/[0.05] text-black/55";
  }
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [wholesale, setWholesale] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          productsResult,
          ordersResult,
          reviewsResult,
          contactsResult,
          wholesaleResult,
        ] = await Promise.all([
          supabase
            .from("products")
            .select("id,name,price,stock,active,created_at")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("orders")
            .select(
              "id,order_number,full_name,total,status,payment_status,payment_method,created_at"
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("reviews")
            .select(
              "id,customer_name,rating,review,approved,created_at"
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("contact_messages")
            .select("id,name,email,message,created_at")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("wholesale_inquiries")
            .select(
              "id,business_name,contact_name,email,message,created_at"
            )
            .order("created_at", {
              ascending: false,
            }),
        ]);

        const errors = [
          productsResult.error,
          ordersResult.error,
          reviewsResult.error,
          contactsResult.error,
          wholesaleResult.error,
        ].filter(Boolean);

        if (errors.length > 0) {
          throw errors[0];
        }

        setProducts(productsResult.data || []);
        setOrders(ordersResult.data || []);
        setReviews(reviewsResult.data || []);
        setContacts(contactsResult.data || []);
        setWholesale(wholesaleResult.data || []);
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);

        setError(
          err?.message || "Could not load dashboard data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalRevenue = orders
    .filter(
      (order) =>
        order.payment_status === "paid" ||
        order.payment_method === "pay_on_delivery"
    )
    .reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const lowStockProducts = products.filter(
    (product) => Number(product.stock || 0) <= 5
  ).length;

  const pendingReviews = reviews.filter(
    (review) => !review.approved
  ).length;

  const totalMessages = contacts.length + wholesale.length;

  const recentOrders = orders.slice(0, 5);
  const recentReviews = reviews.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff1f8f]">
                Plugged by Ayeley
              </p>

              <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
                Admin Dashboard
              </h1>

              <p className="mt-1 text-sm text-black/45">
                Your store at a glance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">
              Could not load dashboard
            </p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[#ff1f8f]" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Total Orders"
                value={orders.length}
                note={
                  pendingOrders > 0
                    ? `${pendingOrders} need attention`
                    : "No pending orders"
                }
                pink
              />

              <StatCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Order Value"
                value={formatGhs(totalRevenue)}
                note="Current order value"
              />

              <StatCard
                icon={<Package className="h-5 w-5" />}
                label="Products"
                value={products.length}
                note={
                  lowStockProducts > 0
                    ? `${lowStockProducts} low stock`
                    : "Stock looks good"
                }
              />

              <StatCard
                icon={<MessageSquare className="h-5 w-5" />}
                label="Messages"
                value={totalMessages}
                note={`${pendingReviews} reviews pending`}
              />
            </section>

            {/* Management */}
            <section className="mt-9">
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff1f8f]">
                  Management
                </p>

                <h2 className="mt-1 font-heading text-2xl font-bold">
                  Manage your store
                </h2>

                <p className="mt-1 text-sm text-black/45">
                  Everything your admin needs in one place.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <ManagementCard
                  href="/admin/products"
                  icon={<Package className="h-6 w-6" />}
                  title="Products"
                  description="Add products, update prices and manage stock."
                  badge={
                    lowStockProducts > 0
                      ? `${lowStockProducts} low stock`
                      : "Stock OK"
                  }
                />

                <ManagementCard
                  href="/admin/orders"
                  icon={<ShoppingBag className="h-6 w-6" />}
                  title="Orders"
                  description="View orders and update their status."
                  badge={
                    pendingOrders > 0
                      ? `${pendingOrders} pending`
                      : "All caught up"
                  }
                />

                <ManagementCard
                  href="/admin/reviews"
                  icon={<Star className="h-6 w-6" />}
                  title="Reviews"
                  description="Approve and manage customer reviews."
                  badge={
                    pendingReviews > 0
                      ? `${pendingReviews} waiting`
                      : "All approved"
                  }
                />

                <ManagementCard
                  href="/admin/messages"
                  icon={<MessageSquare className="h-6 w-6" />}
                  title="Messages"
                  description="Read customer and wholesale enquiries."
                  badge={`${totalMessages} total`}
                />

                <ManagementCard
                  href="/admin/settings"
                  icon={<Settings className="h-6 w-6" />}
                  title="Settings"
                  description="Manage store details, payments, delivery and store status."
                  badge="Store controls"
                />
              </div>
            </section>

            {/* Overview */}
            <section className="mt-9 grid gap-4 md:grid-cols-3">
              <OverviewCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Pending Orders"
                value={pendingOrders}
                description="Orders that need attention"
              />

              <OverviewCard
                icon={<Package className="h-5 w-5" />}
                label="Delivered"
                value={deliveredOrders}
                description="Successfully completed orders"
              />

              <OverviewCard
                icon={<Star className="h-5 w-5" />}
                label="Reviews"
                value={reviews.length}
                description="Customer feedback received"
              />
            </section>

            {/* Recent Orders */}
            <section className="mt-9">
              <SectionHeading
                title="Recent Orders"
                description="The latest orders placed by customers."
                href="/admin/orders"
              />

              <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
                {recentOrders.length === 0 ? (
                  <EmptyBlock message="No orders yet." />
                ) : (
                  <div className="divide-y divide-black/[0.06]">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 transition hover:bg-[#fff8fc] sm:px-6"
                      >
                        <div>
                          <p className="font-mono text-sm font-bold">
                            #{order.order_number}
                          </p>

                          <p className="mt-1 text-sm font-medium text-black/70">
                            {order.full_name}
                          </p>

                          <p className="mt-1 text-xs text-black/35">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold">
                            {formatGhs(order.total)}
                          </p>

                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Recent Reviews */}
            <section className="mt-9">
              <SectionHeading
                title="Recent Reviews"
                description="The latest customer feedback."
                href="/admin/reviews"
              />

              {recentReviews.length === 0 ? (
                <EmptyBlock message="No reviews yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {recentReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold">
                          {review.customer_name}
                        </p>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            review.approved
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-pink-50 text-[#e60078]"
                          }`}
                        >
                          {review.approved
                            ? "Approved"
                            : "Pending"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Number(review.rating || 0)
                                ? "fill-[#ff1f8f] text-[#ff1f8f]"
                                : "text-black/15"
                            }`}
                          />
                        ))}
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-black/55">
                        {review.review}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  pink = false,
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            pink
              ? "bg-[#ff1f8f] text-white"
              : "bg-[#fff0f7] text-[#ff1f8f]"
          }`}
        >
          {icon}
        </div>

        <span className="text-right text-xs text-black/35">
          {note}
        </span>
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function ManagementCard({
  href,
  icon,
  title,
  description,
  badge,
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#ff1f8f]/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f7] text-[#ff1f8f] transition group-hover:bg-[#ff1f8f] group-hover:text-white">
          {icon}
        </div>

        <ArrowUpRight className="h-5 w-5 text-black/20 transition group-hover:text-[#ff1f8f]" />
      </div>

      <h3 className="mt-5 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-black/45">
        {description}
      </p>

      <span className="mt-4 inline-flex rounded-full bg-[#fff0f7] px-3 py-1 text-xs font-semibold text-[#e60078]">
        {badge}
      </span>
    </Link>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f7] text-[#ff1f8f]">
        {icon}
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
      </p>

      <p className="mt-1 text-4xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-sm text-black/40">
        {description}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  href,
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff1f8f]">
          Overview
        </p>

        <h2 className="mt-1 font-heading text-2xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-black/40">
          {description}
        </p>
      </div>

      <Link
        to={href}
        className="shrink-0 text-sm font-semibold text-[#ff1f8f] transition hover:text-black"
      >
        View all →
      </Link>
    </div>
  );
}

function EmptyBlock({ message }) {
  return (
    <div className="p-8 text-center text-sm text-black/40">
      {message}
    </div>
  );
}