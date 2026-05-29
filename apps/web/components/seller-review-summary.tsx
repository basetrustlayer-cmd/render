import { ReviewReportButton } from "./review-report-button";
import type { SellerReview, SellerReviewSummary } from "../lib/get-seller-reviews";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-amber-600">
      {"★".repeat(rating)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function reputationValue(summary: SellerReviewSummary) {
  if (summary.averageRating === null || summary.reviewCount === null) {
    return "Pending";
  }

  return summary.reviewCount === 0 ? "New" : summary.averageRating.toFixed(1);
}

function reputationLabel(summary: SellerReviewSummary) {
  if (summary.averageRating === null || summary.reviewCount === null) {
    return "TrustLayer projection pending";
  }

  return `${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"}`;
}

export function SellerReviewSummary({
  summary,
  reviews
}: {
  summary: SellerReviewSummary;
  reviews: SellerReview[];
}) {
  return (
    <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
            Reputation
          </p>
          <h2 className="text-3xl font-black text-gray-950">Buyer reviews</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right">
          <p className="text-3xl font-black text-gray-950">{reputationValue(summary)}</p>
          <p className="text-sm font-semibold text-gray-600">{reputationLabel(summary)}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-gray-600">
          This seller has not received public buyer reviews yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-gray-950">{review.reviewer.displayName}</p>
                  <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                </div>
                <Stars rating={review.rating} />
              </div>

              {review.body ? (
                <p className="mt-3 text-gray-700">{review.body}</p>
              ) : (
                <p className="mt-3 text-gray-500">No written comment provided.</p>
              )}

              <ReviewReportButton reviewId={review.id} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
