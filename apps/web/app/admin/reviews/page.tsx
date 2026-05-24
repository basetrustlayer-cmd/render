"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type AdminReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  safeDealId: string;
  reportCount: number;
  latestReportReason: string | null;
  reviewer: {
    id: string;
    label: string;
    isBusiness: boolean;
  };
  reviewee: {
    id: string;
    label: string;
    isBusiness: boolean;
  };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadReviews() {
    try {
      const result = await apiFetch<{ reviews: AdminReview[] }>("/admin/reviews");
      setReviews(result.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load reviews.");
    }
  }

  async function removeReview(id: string) {
    const reason = prompt("Removal reason");
    if (!reason) return;

    await apiFetch(`/admin/reviews/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ reason })
    });

    await loadReviews();
  }

  useEffect(() => {
    void loadReviews();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">
          Reputation moderation
        </p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Review Moderation</h1>
        <p className="mt-2 text-gray-600">
          Inspect buyer reviews, user reports, and remove abusive or fraudulent review content.
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold uppercase text-gray-500">
                      {review.rating}/5 stars
                    </p>
                    {review.reportCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        {review.reportCount} report{review.reportCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-gray-800">
                    {review.body ?? "No written comment provided."}
                  </p>

                  {review.latestReportReason && (
                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      Latest report: {review.latestReportReason}
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 text-xs text-gray-500 md:grid-cols-2">
                    <p>Reviewer: {review.reviewer.label}</p>
                    <p>Seller: {review.reviewee.label}</p>
                    <p>SafeDeal: {review.safeDealId}</p>
                    <p>Created: {new Date(review.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void removeReview(review.id)}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  Remove review
                </button>
              </div>
            </article>
          ))}

          {reviews.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              No reviews found.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
