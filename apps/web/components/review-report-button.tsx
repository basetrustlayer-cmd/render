"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";

export function ReviewReportButton({ reviewId }: { reviewId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function reportReview() {
    const reason = prompt("Why should this review be reviewed by moderators?");
    if (!reason) return;

    try {
      await apiFetch(`/reviews/${reviewId}/report`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      setStatus("Reported");
    } catch (err) {
      setStatus(err instanceof Error ? "Unable to report" : "Unable to report");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={reportReview}
        className="text-sm font-semibold text-red-700 underline"
      >
        Report review
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}
