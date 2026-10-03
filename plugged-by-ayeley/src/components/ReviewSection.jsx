import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const MAX_NAME_LENGTH = 100;
const MAX_REVIEW_LENGTH = 3000;

function StarRating({
  value,
  onChange,
  size = "h-5 w-5",
  label = "Rating",
}) {
  return (
    <div
      className="flex gap-1"
      role={onChange ? "radiogroup" : undefined}
      aria-label={label}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Number(value || 0);

        if (!onChange) {
          return (
            <Star
              key={star}
              className={cn(
                size,
                active
                  ? "fill-pink text-pink"
                  : "text-muted-foreground/30"
              )}
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
            role="radio"
            aria-checked={Number(value) === star}
            aria-label={`${star} out of 5 stars`}
          >
            <Star
              className={cn(
                size,
                active
                  ? "fill-pink text-pink"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    rating: 5,
    review: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error: queryError } = await supabase
        .from("reviews")
        .select(`
          id,
          product_id,
          customer_name,
          rating,
          review,
          created_at
        `)
        .eq("product_id", productId)
        .eq("approved", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

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
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const customerName =
      form.customer_name.trim();

    const reviewText =
      form.review.trim();

    if (customerName.length < 2) {
      setError("Please enter your name.");
      return;
    }

    if (customerName.length > MAX_NAME_LENGTH) {
      setError("Your name is too long.");
      return;
    }

    if (
      !Number.isInteger(Number(form.rating)) ||
      Number(form.rating) < 1 ||
      Number(form.rating) > 5
    ) {
      setError("Please choose a rating from 1 to 5.");
      return;
    }

    if (reviewText.length < 3) {
      setError("Please enter a review.");
      return;
    }

    if (reviewText.length > MAX_REVIEW_LENGTH) {
      setError("Your review is too long.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      /*
       * Guest reviews are created through the secure
       * Edge Function. The browser never inserts directly
       * into the reviews table.
       */
      const { data, error: functionError } =
        await supabase.functions.invoke(
          "create-review",
          {
            body: {
              product_id: productId,
              customer_name: customerName,
              rating: Number(form.rating),
              review: reviewText,
            },
          }
        );

      if (functionError) {
        throw new Error(
          functionError.message ||
            "Failed to submit your review."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Failed to submit your review."
        );
      }

      setSuccess(true);

      setForm({
        customer_name: "",
        rating: 5,
        review: "",
      });

      /*
       * Give the customer confirmation, then refresh
       * the public approved reviews.
       */
      window.setTimeout(async () => {
        setShowForm(false);
        setSuccess(false);

        await loadReviews();
      }, 1800);
    } catch (err) {
      console.error(
        "Review submission failed:",
        err
      );

      setError(
        err?.message ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-border pt-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-carbon sm:text-3xl">
            Customer Reviews
          </h2>

          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <StarRating
                value={Math.round(avgRating)}
                size="h-4 w-4"
              />

              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} out of 5 (
                {reviews.length}{" "}
                {reviews.length === 1
                  ? "review"
                  : "reviews"}
                )
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setShowForm((current) => !current)
          }
          className="whitespace-nowrap border border-carbon px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-carbon hover:text-white"
        >
          {showForm
            ? "Close"
            : "Write a Review"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 border border-border bg-london/50 p-5 sm:p-6"
        >
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Star className="h-6 w-6 fill-green-600 text-green-600" />
              </div>

              <p className="font-semibold text-carbon">
                Thank you for your review!
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Your review has been submitted.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-carbon">
                  Your Rating
                </label>

                <StarRating
                  value={form.rating}
                  onChange={(value) =>
                    setField("rating", value)
                  }
                />
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                  Name *
                </label>

                <input
                  type="text"
                  value={form.customer_name}
                  onChange={(event) =>
                    setField(
                      "customer_name",
                      event.target.value
                    )
                  }
                  className="ck-input"
                  placeholder="Your name"
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                  Comment *
                </label>

                <textarea
                  value={form.review}
                  onChange={(event) =>
                    setField(
                      "review",
                      event.target.value
                    )
                  }
                  className="ck-input min-h-[120px] resize-y"
                  placeholder="Share your thoughts about this product"
                  maxLength={MAX_REVIEW_LENGTH}
                  required
                />

                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {form.review.length}/
                  {MAX_REVIEW_LENGTH}
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mb-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 bg-carbon px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-pink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Review"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-carbon disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse bg-london"
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-london/30 py-12 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />

          <p className="text-muted-foreground">
            No reviews yet. Be the first to share your
            feedback!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-border pb-6"
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-carbon">
                    {review.customer_name}
                  </p>

                  <StarRating
                    value={review.rating}
                    size="h-3.5 w-3.5"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {review.created_at
                    ? new Date(
                        review.created_at
                      ).toLocaleDateString(
                        "en-GH",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    : "—"}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {review.review}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}