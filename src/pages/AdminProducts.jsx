import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { CATEGORIES } from "@/lib/siteConfig";

function formatGhs(value) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getCategoryName(category) {
  if (typeof category === "string") {
    return category;
  }

  return category?.name || category?.slug || "";
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [error, setError] = useState("");
  const [dataLoadError, setDataLoadError] = useState("");

  const loadProducts = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setDataLoadError("");

      try {
        const { data, error: queryError } =
          await supabase
            .from("products")
            .select("*")
            .order("created_at", {
              ascending: false,
            });

        if (queryError) {
          throw queryError;
        }

        setProducts(data || []);
        setDataLoadError("");
      } catch (err) {
        console.error(
          "Failed to load products:",
          err
        );

        const message = err?.message || "Could not load products.";
        if (!manual) setProducts([]);
        setDataLoadError(message);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleActive = async (product) => {
    setError("");

    const nextActive = !product.active;

    try {
      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            active: nextActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

      if (updateError) {
        throw updateError;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                active: nextActive,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Failed to update product:",
        err
      );

      setError(
        err?.message ||
          "Could not update product."
      );
    }
  };

  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}" permanently?`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("products")
          .delete()
          .eq("id", product.id);

      if (deleteError) {
        throw deleteError;
      }

      setProducts((current) =>
        current.filter(
          (item) => item.id !== product.id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete product:",
        err
      );

      setError(
        err?.message ||
          "Could not delete product."
      );
    }
  };

  const categories = useMemo(() => {
    const configuredCategories =
      Array.isArray(CATEGORIES)
        ? CATEGORIES
            .map(getCategoryName)
            .filter(Boolean)
        : [];

    const productCategories = products
      .map((product) => product.category)
      .filter(Boolean);

    return [
      ...new Set([
        ...configuredCategories,
        ...productCategories,
      ]),
    ].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          ?.toLowerCase()
          .includes(query) ||
        product.slug
          ?.toLowerCase()
          .includes(query) ||
        product.category
          ?.toLowerCase()
          .includes(query);

      const stock = Number(product.stock_quantity || 0);
      const threshold = Number(
        product.low_stock_threshold ?? 5
      );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          product.active) ||
        (statusFilter === "hidden" &&
          !product.active) ||
        (statusFilter === "low" &&
          stock > 0 &&
          stock <= threshold) ||
        (statusFilter === "out" &&
          stock <= 0);

      const matchesCategory =
        categoryFilter === "all" ||
        product.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    products,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.active
  ).length;

  const hiddenProducts =
    totalProducts - activeProducts;

  const lowStockProducts = products.filter(
    (product) => {
      const stock = Number(
        product.stock_quantity || 0
      );

      const threshold = Number(
        product.low_stock_threshold ?? 5
      );

      return stock > 0 && stock <= threshold;
    }
  ).length;

  const outOfStockProducts =
    products.filter(
      (product) =>
        Number(product.stock_quantity || 0) <= 0
    ).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const hasFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    categoryFilter !== "all";

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">
                  Admin
                </p>

                <h1 className="mt-1 font-heading text-2xl font-bold">
                  Products
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  Manage your store catalog.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadProducts(true)
                }
                disabled={refreshing}
                className="hidden items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f] disabled:opacity-50 sm:flex"
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

              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ff1f8f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e60078]"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg px-2 py-1 font-bold hover:bg-red-100"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={
              <Package className="h-5 w-5" />
            }
            label="Total Products"
            value={loading ? "…" : dataLoadError ? "—" : totalProducts}
            note={loading ? "Loading…" : dataLoadError ? "Unavailable" : `${activeProducts} active`}
          />

          <StatCard
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            label="Active"
            value={loading ? "…" : dataLoadError ? "—" : activeProducts}
            note={loading ? "Loading…" : dataLoadError ? "Unavailable" : "Visible in shop"}
            pink
          />

          <StatCard
            icon={
              <Archive className="h-5 w-5" />
            }
            label="Low Stock"
            value={loading ? "…" : dataLoadError ? "—" : lowStockProducts}
            note={loading ? "Loading…" : dataLoadError ? "Unavailable" : "Needs attention"}
          />

          <StatCard
            icon={
              <XCircle className="h-5 w-5" />
            }
            label="Out of Stock"
            value={loading ? "…" : dataLoadError ? "—" : outOfStockProducts}
            note={loading ? "Loading…" : dataLoadError ? "Unavailable" : `${hiddenProducts} hidden`}
          />
        </section>

        {/* Filters */}
        <section className="mt-7 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search products..."
                className="w-full rounded-xl border border-black/10 bg-[#fafafa] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff1f8f] focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#ff1f8f]"
            >
              <option value="all">
                All statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="hidden">
                Hidden
              </option>

              <option value="low">
                Low stock
              </option>

              <option value="out">
                Out of stock
              </option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#ff1f8f]"
            >
              <option value="all">
                All categories
              </option>

              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
            <p className="text-sm text-black/45">
              Showing{" "}
              <span className="font-semibold text-black">
                {loading ? "…" : dataLoadError ? "—" : filteredProducts.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-black">
                {loading ? "…" : dataLoadError ? "—" : products.length}
              </span>{" "}
              products
            </p>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-[#ff1f8f] transition hover:text-black"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {/* Product list */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          {loading ? (
            <LoadingState />
          ) : dataLoadError ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center text-sm text-black/45">
              Products could not be loaded. Use Refresh to try again.
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              hasFilters={hasFilters}
              onClear={clearFilters}
            />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-[#fafafa] text-left">
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Product
                      </th>

                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Category
                      </th>

                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Price
                      </th>

                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Stock
                      </th>

                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map(
                      (product) => (
                        <DesktopProductRow
                          key={product.id}
                          product={product}
                          onToggle={() =>
                            toggleActive(product)
                          }
                          onDelete={() =>
                            deleteProduct(product)
                          }
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="divide-y divide-black/[0.06] lg:hidden">
                {filteredProducts.map(
                  (product) => (
                    <MobileProductCard
                      key={product.id}
                      product={product}
                      onToggle={() =>
                        toggleActive(product)
                      }
                      onDelete={() =>
                        deleteProduct(product)
                      }
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
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
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
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

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-black/40">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function DesktopProductRow({
  product,
  onToggle,
  onDelete,
}) {
  return (
    <tr className="border-b border-black/[0.05] transition hover:bg-[#fff9fc]">
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <ProductImage product={product} />

          <div className="min-w-0">
            <p className="truncate font-semibold">
              {product.name}
            </p>

            <p className="mt-1 truncate text-xs text-black/40">
              {product.category ||
                "Uncategorized"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-5 text-sm text-black/55">
        {product.category || "—"}
      </td>

      <td className="px-6 py-5">
        <p className="font-semibold">
          {formatGhs(product.price)}
        </p>

        {product.compare_at_price &&
          Number(product.compare_at_price) >
            Number(product.price || 0) && (
            <p className="mt-1 text-xs text-black/35 line-through">
              {formatGhs(
                product.compare_at_price
              )}
            </p>
          )}
      </td>

      <td className="px-6 py-5">
        <StockBadge product={product} />
      </td>

      <td className="px-6 py-5">
        <StatusBadge
          active={product.active}
        />
      </td>

      <td className="px-6 py-5">
        <ProductActions
          product={product}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

function MobileProductCard({
  product,
  onToggle,
  onDelete,
}) {
  return (
    <div className="p-5">
      <div className="flex gap-4">
        <ProductImage product={product} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">
                {product.name}
              </h3>

              <p className="mt-1 text-xs text-black/40">
                {product.category ||
                  "Uncategorized"}
              </p>
            </div>

            <StatusBadge
              active={product.active}
            />
          </div>

          <div className="mt-4">
            <p className="font-semibold">
              {formatGhs(product.price)}
            </p>

            <div className="mt-2">
              <StockBadge product={product} />
            </div>
          </div>

          <div className="mt-4">
            <ProductActions
              product={product}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductActions({
  product,
  onToggle,
  onDelete,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to={`/admin/products/${product.id}/edit`}
        className="rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
      >
        Edit
      </Link>

      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
      >
        {product.active ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}

        {product.active
          ? "Hide"
          : "Show"}
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}

function ProductImage({ product }) {
  const image =
    product.image_url || product.additional_images?.[0] || "";

  if (!image) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]">
        <Package className="h-6 w-6" />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt=""
      className="h-16 w-16 shrink-0 rounded-2xl border border-black/[0.06] bg-white object-cover"
    />
  );
}

function StockBadge({ product }) {
  const stock = Number(
    product.stock_quantity || 0
  );

  const threshold = Number(
    product.low_stock_threshold ?? 5
  );

  if (stock <= 0) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
        Out of stock
      </span>
    );
  }

  if (stock <= threshold) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        {stock} left
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      {stock} in stock
    </span>
  );
}

function StatusBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-xs font-semibold text-black/45">
      <span className="h-1.5 w-1.5 rounded-full bg-black/25" />
      Hidden
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5 p-6">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4"
        >
          <div className="h-16 w-16 rounded-2xl bg-black/[0.05]" />

          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 rounded bg-black/[0.05]" />
            <div className="h-3 w-28 rounded bg-black/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]">
        <Package className="h-7 w-7" />
      </div>

      <h2 className="mt-5 font-heading text-xl font-bold">
        {hasFilters
          ? "No matching products"
          : "Your catalog is empty"}
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-black/45">
        {hasFilters
          ? "Try changing your search or filters."
          : "Add your first product to start building your catalog."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 rounded-xl bg-[#ff1f8f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e60078]"
        >
          Clear Filters
        </button>
      ) : (
        <Link
          to="/admin/products/new"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ff1f8f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e60078]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      )}
    </div>
  );
}
