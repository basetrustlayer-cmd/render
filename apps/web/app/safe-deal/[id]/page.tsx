"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SafeDealReviewForm } from "../../../components/safe-deal-review-form";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

function projectionBadge(label: string, freshness?: string) {
  const value = freshness ?? "UNKNOWN";
  return `${label}: ${value}`;
}

function dealStatus(deal: SafeDeal): string {
  return deal.escrowStatusCached ?? dealStatus(deal) ?? "PENDING";
}

function dealAmount(deal: SafeDeal): string {
  return deal.escrowAmountCached ?? dealAmount(deal) ?? "0.00";
}

function dealFee(deal: SafeDeal): string {
  return deal.escrowFeeCached ?? dealFee(deal) ?? "0.00";
}

type SafeDeal = {
  id: string;
  amount?: string;
  feeAmount?: string;
  status?: string;
  escrowAmountCached?: string;
  escrowFeeCached?: string;
  escrowStatusCached?: string | null;
  escrowProjection?: { freshness: string };
  disputeProjection?: {
    disputeStatusCached?: string | null;
    disputeReasonCached?: string | null;
    disputeLastSyncedAt?: string | null;
    freshness?: string;
  };
  buyerId: string;
  sellerId: string;
  listing: { id: string; title: string };
  review: {
    id: string;
    rating: number;
    body: string | null;
    createdAt: string;
  } | null;
};

export default function SafeDealDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [safeDeal, setSafeDeal] = useState<SafeDeal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await apiFetch<{ safeDeal: SafeDeal }>(`/safe-deals/${params.id}`);
      setSafeDeal(result.safeDeal);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Safe Deal.");
    }
  }

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (user?.id) void load();
  }, [user?.id]);

  async function action(type: "confirm" | "dispute") {
    try {
      await apiFetch(`/safe-deals/${params.id}/${type}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/dashboard/safe-deals" className="text-sm underline">← Back to Safe Deals</Link>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Safe Deal</h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {safeDeal && (
          <div className="mt-6 grid gap-4">
            <p><strong>Listing:</strong> {safeDeal.listing.title}</p>
            <p><strong>Amount:</strong> GHS {safeDeal.amount}</p>
            <p><strong>Fee:</strong> GHS {safeDeal.feeAmount}</p>
            <p><strong>Status:</strong> {safeDeal.status}</p>

            {safeDeal.review && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">Review submitted</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Rating: {safeDeal.review.rating}/5
                </p>
                {safeDeal.review.body && (
                  <p className="mt-2 text-sm text-emerald-800">{safeDeal.review.body}</p>
                )}
              </div>
            )}

            {safeDeal.buyerId === user?.id &&
              !safeDeal.review &&
              ["CONFIRMED", "COMPLETE"].includes(dealStatus(safeDeal)) && (
                <SafeDealReviewForm safeDealId={safeDeal.id} onSubmitted={load} />
              )}

            <div className="mt-4 flex gap-3">
              {safeDeal.buyerId === user?.id && ["FUNDED", "DELIVERED"].includes(dealStatus(safeDeal)) && (
                <button onClick={() => action("confirm")} className="rounded bg-emerald-700 px-4 py-2 text-white">
                  Confirm Delivery
                </button>
              )}

              {["FUNDED", "DELIVERED"].includes(dealStatus(safeDeal)) && (
                <button onClick={() => action("dispute")} className="rounded border border-red-300 px-4 py-2 text-red-700">
                  Open Dispute
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
