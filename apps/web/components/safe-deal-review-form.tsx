"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

export function SafeDealReviewForm({
  safeDealId,
  onSubmitted
}: {
  safeDealId: string;
  onSubmitted: () => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReview() {
    try {
      setIsSubmitting(true);
      setError(null);

      await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          safeDealId,
          rating,
          body: body.trim() || undefined
        })
      });

      setBody("");
      await onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-xl font-bold text-gray-950">Review this seller</h2>
      <p className="mt-1 text-sm text-gray-600">
        Reviews are available after a confirmed or completed Safe Deal.
      </p>

      <label className="mt-4 block text-sm font-semibold text-gray-700">
        Rating
        <select
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className="mt-2 w-full rounded border border-gray-300 bg-white p-2"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-sm font-semibold text-gray-700">
        Comment
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded border border-gray-300 bg-white p-3"
          placeholder="Share what went well, delivery accuracy, and seller communication."
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submitReview}
        disabled={isSubmitting}
        className="mt-4 rounded bg-gray-950 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Submitting..." : "Submit review"}
      </button>
    </section>
  );
}
