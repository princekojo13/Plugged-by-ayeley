import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Stars({ rating }) {
  const value = Number(rating || 0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= value
              ? "fill-[#ff1f8f] text-[#ff1f8f]"
              : "text-black/15"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [error, setError] = useState("");

  const loadReviews = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const { data, error: queryError } =
          await supabase
            .from("reviews")
            .select(`
              *,
              products (
                id,
                name
              )
            `)
            .order("created_at", {
              ascending: false,
            });

        if (queryError) {
          throw queryError;
        }

        setReviews(data || []);
      } catch (err) {
        console.error(
          "Failed to load reviews:",
          err
        );

        setReviews([]);

        setError(
          err?.message ||
            "Could not load reviews."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const updateApproval = async (
    review,
    approved
  ) => {
    setUpdating(review.id);
    setError("");

    try {
      const { error: updateError } =
        await supabase
          .from("reviews")
          .update({ approved })
          .eq("id", review.id);

      if (updateError) {
        throw updateError;
      }

      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                approved,
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Failed to update review:",
        err
      );

      setError(
        err?.message ||
          "Could not update the review."
      );
    } finally {
      setUpdating(null);
    }
  };

  const deleteReview = async (review) => {
    const confirmed = window.confirm(
      "Delete this customer review permanently?"
    );

    if (!confirmed) {
      return;
    }

    setUpdating(review.id);
    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("reviews")
          .delete()
          .eq("id", review.id);

      if (deleteError) {
        throw deleteError;
      }

      setReviews((current) =>
        current.filter(
          (item) => item.id !== review.id
        )
      );
    } catch (err) {
      console.error(
        "Failed to delete review:",
        err
      );

      setError(
        err?.message ||
          "Could not delete the review."
      );
    } finally {
      setUpdating(null);
    }
  };

  const filteredReviews = useMemo(() => {
    const value = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesSearch =
        !value ||
        review.customer_name
          ?.toLowerCase()
          .includes(value) ||
        review.review_text
          ?.toLowerCase()
          .includes(value) ||
        review.products?.name
          ?.toLowerCase()
          .includes(value);

      const matchesFilter =
        filter === "all" ||
        (filter === "approved" &&
          review.approved === true) ||
        (filter === "pending" &&
          review.approved !== true);

      return matchesSearch && matchesFilter;
    });
  }, [reviews, search, filter]);

  const approvedCount = reviews.filter(
    (review) => review.approved
  ).length;

  const pendingCount =
    reviews.length - approvedCount;

  const averageRating =
    reviews.length === 0
      ? 0
      : reviews.reduce(
          (sum, review) =>
            sum + Number(review.rating || 0),
          0
        ) / reviews.length;

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
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">
                  Admin
                </p>

                <h1 className="mt-1 font-heading text-2xl font-bold">
                  Reviews
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  Manage customer feedback and approvals.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadReviews(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f] disabled:opacity-50"
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
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">
              Something went wrong
            </p>

            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Reviews"
            value={reviews.length}
          />

          <StatCard
            label="Approved"
            value={approvedCount}
            pink
          />

          <StatCard
            label="Pending"
            value={pendingCount}
          />

          <StatCard
            label="Average Rating"
            value={
              reviews.length
                ? `${averageRating.toFixed(1)} / 5`
                : "—"
            }
          />
        </section>

        {/* Search / Filter */}
        <section className="mt-7 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search customer, product or review..."
                className="w-full rounded-xl border border-black/10 bg-[#fafafa] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff1f8f] focus:bg-white"
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-[#ff1f8f]"
            >
              <option value="all">
                All reviews
              </option>

              <option value="pending">
                Pending approval
              </option>

              <option value="approved">
                Approved
              </option>
            </select>
          </div>

          <div className="mt-4 border-t border-black/[0.06] pt-4 text-sm text-black/40">
            Showing{" "}
            <span className="font-semibold text-black">
              {filteredReviews.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-black">
              {reviews.length}
            </span>{" "}
            reviews
          </div>
        </section>

        {/* Reviews */}
        <section className="mt-6">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-black/[0.07] bg-white">
              <RefreshCw className="h-8 w-8 animate-spin text-[#ff1f8f]" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-black/[0.07] bg-white px-6 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]">
                <Star className="h-6 w-6" />
              </div>

              <h2 className="mt-5 font-heading text-xl font-bold">
                No reviews found
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-black/40">
                Customer reviews will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  updating={
                    updating === review.id
                  }
                  onApprove={() =>
                    updateApproval(
                      review,
                      true
                    )
                  }
                  onUnapprove={() =>
                    updateApproval(
                      review,
                      false
                    )
                  }
                  onDelete={() =>
                    deleteReview(review)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ReviewCard({
  review,
  updating,
  onApprove,
  onUnapprove,
  onDelete,
}) {
  return (
    <article className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm transition hover:border-[#ff1f8f]/20 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Stars
              rating={Number(
                review.rating || 0
              )}
            />

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                review.approved
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#fff0f7] text-[#e60078]"
              }`}
            >
              {review.approved
                ? "Approved"
                : "Pending"}
            </span>
          </div>

          <h2 className="mt-4 text-lg font-bold">
            {review.products?.name ||
              "Unknown product"}
          </h2>

          <p className="mt-3 text-sm leading-7 text-black/60">
            {review.review_text ||
              "No review text provided."}
          </p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-black/40">
            <span>
              By{" "}
              <strong className="text-black/70">
                {review.customer_name ||
                  "Anonymous"}
              </strong>
            </span>

            <span>
              {formatDate(
                review.created_at
              )}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {review.approved ? (
            <button
              type="button"
              disabled={updating}
              onClick={onUnapprove}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}

              Unapprove
            </button>
          ) : (
            <button
              type="button"
              disabled={updating}
              onClick={onApprove}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff1f8f] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e60078] disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}

              Approve
            </button>
          )}

          <button
            type="button"
            disabled={updating}
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}

            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function StatCard({
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
