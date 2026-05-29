"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SafeDealReviewForm } from "../../../components/safe-deal-review-form";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type ProjectionFreshness =
  | string
  | {
      state?: string;
      ageMs?: number;
      maxAgeMs?: number;
    };

type SafeDeal = {
  id: string;
  amount?: string | number | null;
  feeAmount?: string | number | null;
  status?: string | null;
  escrowAmountCached?: string | number | null;
  escrowFeeCached?: string | number | null;
  escrowStatusCached?: string | null;
  escrowProjection?: {
    escrowStatusCached?: string | null;
    freshness?: ProjectionFreshness;
  };
  disputeProjection?: {
    disputeStatusCached?: string | null;
    disputeReasonCached?: string | null;
    disputeLastSyncedAt?: string | null;
    freshness?: ProjectionFreshness;
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

function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
}

function getDealStatus(deal: SafeDeal): string {
  return deal.escrowStatusCached ?? deal.status ?? "PENDING";
}

function getDealAmount(deal: SafeDeal): string {
  return formatMoney(deal.escrowAmountCached ?? deal.amount);
}

function getDealFee(deal: SafeDeal): string {
  return formatMoney(deal.escrowFeeCached ?? deal.feeAmount);
}

function freshnessLabel(value?: ProjectionFreshness): string {
  if (!value) return "UNKNOWN";
  if (typeof value === "string") return value;
  return value.state ?? "UNKNOWN";
}

export default function SafeDealDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [safeDeal, setSafeDeal] = useState<SafeDeal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const currentStatus = useMemo(
    () => (safeDeal ? getDealStatus(safeDeal) : "PENDING"),
    [safeDeal]
  );

  const canAct = safeDeal ? ["FUNDED", "DELIVERED"].includes(currentStatus) : false;
  const isBuyer = safeDeal?.buyerId === user?.id;

  async function confirmDelivery() {
    try {
      setIsSubmitting(true);
      await apiFetch(`/safe-deals/${params.id}/confirm`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openDispute() {
    const reason = disputeReason.trim();

    if (reason.length < 10) {
      setError("Dispute reason must be at least 10 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch(`/safe-deals/${params.id}/dispute`, {
        method: "POST",
        body: JSON.stringify({ reason })
      });
      setDisputeReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link href="/dashboard/safe-deals" className="text-sm underline">
        ← Back to Safe Deals
      </Link>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Safe Deal</h1>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!safeDeal && !error && <p className="mt-6 text-sm text-gray-600">Loading Safe Deal...</p>}

        {safeDeal && (
          <div className="mt-6 grid gap-5">
            <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p><strong>Listing:</strong> {safeDeal.listing.title}</p>
              <p><strong>Amount:</strong> GHS {getDealAmount(safeDeal)}</p>
              <p><strong>Fee:</strong> GHS {getDealFee(safeDeal)}</p>
              <p><strong>Status:</strong> {currentStatus}</p>
              <p className="text-sm text-gray-600">
                Escrow projection freshness: {freshnessLabel(safeDeal.escrowProjection?.freshness)}
              </p>
              {safeDeal.disputeProjection?.disputeStatusCached && (
                <p className="text-sm text-red-700">
                  Dispute: {safeDeal.disputeProjection.disputeStatusCached}
                  {safeDeal.disputeProjection.disputeReasonCached
                    ? ` — ${safeDeal.disputeProjection.disputeReasonCached}`
                    : ""}
                </p>
              )}
            </div>

            {safeDeal.review && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">Review submitted</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Rating: {safeDeal.review.rating}/5
                </p>
                {safeDeal.review.body && (
                  <p className="mt-2 text-sm text-emerald-800">{safeDeal.review.body}</p>
                )}
              </div>
            )}

            {isBuyer && !safeDeal.review && ["CONFIRMED", "COMPLETE"].includes(currentStatus) && (
              <SafeDealReviewForm safeDealId={safeDeal.id} onSubmitted={load} />
            )}

            {canAct && (
              <div className="grid gap-4 rounded-2xl border border-gray-200 p-4">
                {isBuyer && (
                  <button
                    onClick={confirmDelivery}
                    disabled={isSubmitting}
                    className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
                  >
                    Confirm Delivery
                  </button>
                )}

                <div className="grid gap-2">
                  <label htmlFor="disputeReason" className="text-sm font-semibold text-gray-800">
                    Dispute reason
                  </label>
                  <textarea
                    id="disputeReason"
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    className="min-h-24 rounded border border-gray-300 p-3 text-sm"
                    placeholder="Briefly explain the issue with this Safe Deal."
                  />
                  <button
                    onClick={openDispute}
                    disabled={isSubmitting}
                    className="rounded border border-red-300 px-4 py-2 font-semibold text-red-700 disabled:opacity-60"
                  >
                    Open Dispute
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
