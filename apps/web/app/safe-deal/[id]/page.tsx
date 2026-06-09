"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SafeDealReviewForm } from "../../../components/safe-deal-review-form";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type ProjectionFreshness =
  | string
  | { state?: string; ageMs?: number; maxAgeMs?: number };

type SafeDeal = {
  id: string;
  amount?: string | number | null;
  feeAmount?: string | number | null;
  status?: string | null;
  escrowAmountCached?: string | number | null;
  escrowFeeCached?: string | number | null;
  escrowStatusCached?: string | null;
  fundedAt?: string | null;
  inspectionDeadline?: string | null;
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
  return Number.isFinite(numeric)
    ? `GH₵ ${numeric.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : String(value);
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

function freshnessState(value?: ProjectionFreshness): string {
  if (!value) return "UNKNOWN";
  if (typeof value === "string") return value.toUpperCase();
  return (value.state ?? "UNKNOWN").toUpperCase();
}

// UX-004: human-readable freshness badge
function EscrowFreshnessBadge({ freshness }: { freshness?: ProjectionFreshness }) {
  const state = freshnessState(freshness);
  if (state === "FRESH") {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Status up to date</span>;
  }
  if (state === "STALE" || state === "SYNCING") {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Syncing...</span>;
  }
  if (state === "MISSING") {
    return <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">Awaiting confirmation</span>;
  }
  return null;
}

// UX-004: plain-language error translation
function translateProjectionError(msg: string): { heading: string; body: string; retryable: boolean } {
  if (msg.includes("STALE") || msg.includes("projection") || msg.includes("sync")) {
    return {
      heading: "Transaction status is updating",
      body: "We are syncing the latest status from our payments partner. This usually takes under 30 seconds. Please try again shortly.",
      retryable: true,
    };
  }
  if (msg.includes("MISSING")) {
    return {
      heading: "Transaction not yet confirmed",
      body: "The payment has not been confirmed by our payments partner yet. Check back in a minute.",
      retryable: true,
    };
  }
  if (msg.includes("403") || msg.includes("not authorised") || msg.includes("not authorized")) {
    return {
      heading: "Access denied",
      body: "You are not a participant in this Safe Deal.",
      retryable: false,
    };
  }
  return { heading: "Something went wrong", body: msg, retryable: false };
}

// UX-007: inspection countdown
function InspectionCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const ms = new Date(deadline).getTime() - Date.now();
      if (ms <= 0) { setRemaining("Auto-releasing funds..."); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setRemaining(`${h}h ${m}m remaining to inspect`);
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  const ms = new Date(deadline).getTime() - Date.now();
  const isUrgent = ms > 0 && ms < 6 * 3600000;

  return (
    <div className={`rounded-2xl border p-4 ${isUrgent ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-2">
        <span className={`text-lg ${isUrgent ? "text-red-600" : "text-amber-600"}`}>⏱</span>
        <p className={`font-bold text-sm ${isUrgent ? "text-red-800" : "text-amber-800"}`}>{remaining}</p>
      </div>
      <p className="mt-2 text-xs text-gray-600 leading-relaxed">
        Inspect your item before this deadline. If you take no action, funds will be automatically released to the seller.
      </p>
      <ul className="mt-3 grid gap-1">
        {[
          "Check the item matches the listing description",
          "Test that it works correctly",
          "Compare to the listing photos",
        ].map((step) => (
          <li key={step} className="flex items-start gap-2 text-xs text-gray-700">
            <span className="mt-0.5 text-emerald-600">✓</span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

const lifecycleSteps = ["PENDING", "FUNDED", "DELIVERED", "CONFIRMED", "COMPLETE"];

function lifecycleIndex(status: string) {
  const index = lifecycleSteps.indexOf(status);
  return index === -1 ? 0 : index;
}

function SafeDealLifecycle({
  status,
  escrowFreshness,
  disputeStatus,
}: {
  status: string;
  escrowFreshness?: ProjectionFreshness;
  disputeStatus?: string | null;
}) {
  const currentIndex = lifecycleIndex(status);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Safe Deal lifecycle</p>
          <h2 className="text-xl font-black text-gray-950">{status}</h2>
        </div>
        {/* UX-004: replaced raw "Escrow projection: FRESH/STALE" */}
        <EscrowFreshnessBadge freshness={escrowFreshness} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {lifecycleSteps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={step}
              className={`rounded-2xl border p-3 text-sm ${
                isCurrent
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : isComplete
                    ? "border-gray-200 bg-gray-50 text-gray-700"
                    : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              <p className="font-black">{step}</p>
              <p className="mt-1 text-xs">{isCurrent ? "Current" : isComplete ? "Completed" : "Pending"}</p>
            </div>
          );
        })}
      </div>

      {disputeStatus && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Dispute in progress: {disputeStatus}
        </div>
      )}
    </section>
  );
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

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (user?.id) void load(); }, [user?.id]);

  const currentStatus = useMemo(
    () => (safeDeal ? getDealStatus(safeDeal) : "PENDING"),
    [safeDeal]
  );

  const canAct = safeDeal ? ["FUNDED", "DELIVERED"].includes(currentStatus) : false;
  const isBuyer = safeDeal?.buyerId === user?.id;
  const showInspectionTimer = canAct && currentStatus === "DELIVERED" && safeDeal?.inspectionDeadline;

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
    if (reason.length < 10) { setError("Dispute reason must be at least 10 characters."); return; }
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

  // UX-004: translate error before rendering
  const translatedError = error ? translateProjectionError(error) : null;

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link href="/dashboard/safe-deals" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
        ← Back to Safe Deals
      </Link>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Safe Deal</h1>

        {/* UX-004: plain-language error banner with retry */}
        {translatedError && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">{translatedError.heading}</p>
            <p className="mt-1 text-sm text-amber-800">{translatedError.body}</p>
            {translatedError.retryable && (
              <button onClick={load} className="mt-3 text-sm font-bold text-amber-900 underline">
                Refresh status
              </button>
            )}
          </div>
        )}

        {!safeDeal && !error && (
          <p className="mt-6 text-sm text-gray-600">Loading Safe Deal...</p>
        )}

        {safeDeal && (
          <div className="mt-6 grid gap-5">
            <SafeDealLifecycle
              status={currentStatus}
              escrowFreshness={safeDeal.escrowProjection?.freshness}
              disputeStatus={safeDeal.disputeProjection?.disputeStatusCached}
            />

            {/* UX-007: inspection countdown when DELIVERED */}
            {showInspectionTimer && (
              <InspectionCountdown deadline={safeDeal.inspectionDeadline!} />
            )}

            <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <p><strong>Listing:</strong> {safeDeal.listing.title}</p>
              <p><strong>Amount:</strong> {getDealAmount(safeDeal)}</p>
              <p><strong>Fee (1.5%):</strong> {getDealFee(safeDeal)}</p>
              <p><strong>Status:</strong> {currentStatus}</p>
              {safeDeal.disputeProjection?.disputeStatusCached && (
                <p className="text-red-700">
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
                <p className="mt-1 text-sm text-emerald-800">Rating: {safeDeal.review.rating}/5</p>
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
                    className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {isSubmitting ? "Processing..." : "Confirm delivery — release funds"}
                  </button>
                )}
                <div className="grid gap-2">
                  <label htmlFor="disputeReason" className="text-sm font-semibold text-gray-800">
                    Something wrong? Open a dispute
                  </label>
                  <textarea
                    id="disputeReason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="min-h-24 rounded-xl border border-gray-300 p-3 text-sm"
                    placeholder="Describe the issue clearly — what was expected vs what was received."
                  />
                  <button
                    onClick={openDispute}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Open dispute
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
