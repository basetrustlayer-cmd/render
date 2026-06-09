"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

// PL-007: human-readable freshness badge — replaces raw projectionBadge()
function EscrowFreshnessBadge({ freshness }: { freshness?: string }) {
  if (!freshness) return null;
  const state = freshness.toUpperCase();
  if (state === "FRESH") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Status up to date</span>;
  }
  if (state === "STALE" || state === "SYNCING") {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Syncing…</span>;
  }
  if (state === "MISSING") {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">Awaiting confirmation</span>;
  }
  return null;
}

function formatMoney(value?: string | null): string {
  if (!value) return "GH₵ 0.00";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `GH₵ ${value}`;
  return `GH₵ ${numeric.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dealStatus(deal: SafeDeal): string {
  return deal.escrowStatusCached ?? deal.status ?? "PENDING";
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
  createdAt: string;
  listing: { id: string; title: string; category: string };
};

export default function SafeDealsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [safeDeals, setSafeDeals] = useState<SafeDeal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  async function loadSafeDeals() {
    try {
      const result = await apiFetch<{ safeDeals: SafeDeal[] }>("/safe-deals/my");
      setSafeDeals(result.safeDeals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Safe Deals.");
    }
  }

  useEffect(() => { if (!user?.id) return; void loadSafeDeals(); }, [user?.id]);

  async function updateDealStatus(id: string, action: "confirm") {
    setError(null);
    try {
      await apiFetch(`/safe-deals/${id}/${action}`, { method: "POST" });
      await loadSafeDeals();
    } catch (err) {
      // PL-007: translate stale projection errors to plain language
      const msg = err instanceof Error ? err.message : `Unable to ${action} Safe Deal.`;
      if (msg.includes("STALE") || msg.includes("projection") || msg.includes("sync")) {
        setError("Transaction status is still syncing. Wait a moment and try again.");
      } else {
        setError(msg);
      }
    }
  }

  const emptyState = (
    <div className="rounded-2xl bg-gray-50 p-8 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-amber-700">No Safe Deals yet</p>
      <p className="mt-2 text-gray-600">Start a Safe Deal from any listing to protect your transaction with escrow.</p>
      <Link href="/listings" className="mt-4 inline-flex rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-black">
        Browse listings
      </Link>
    </div>
  );

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Safe Deals</h2>
        <p className="mt-1 text-gray-600">Escrow-protected transactions where you are buyer or seller.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {/* Mobile cards */}
        <div className="mt-6 grid gap-4 md:hidden">
          {safeDeals.length === 0 ? emptyState : safeDeals.map((deal) => {
            const status = dealStatus(deal);
            const canAct = ["FUNDED", "DELIVERED"].includes(status);
            const isBuyer = deal.buyerId === user?.id;

            return (
              <article key={deal.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/safe-deal/${deal.id}`} className="font-bold text-gray-900 hover:text-emerald-800">
                      {deal.listing.title}
                    </Link>
                    <p className="mt-1 text-sm text-gray-600">{isBuyer ? "Buyer" : "Seller"} · {status}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                    {formatMoney(deal.escrowAmountCached ?? deal.amount)}
                  </span>
                </div>

                {/* PL-007: freshness badges instead of raw strings */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <EscrowFreshnessBadge freshness={deal.escrowProjection?.freshness} />
                  {deal.disputeProjection?.disputeStatusCached && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                      Dispute: {deal.disputeProjection.disputeStatusCached}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {isBuyer && canAct && (
                    <button
                      onClick={() => updateDealStatus(deal.id, "confirm")}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Confirm delivery
                    </button>
                  )}
                  {canAct && (
                    <Link href={`/safe-deal/${deal.id}`} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                      Open dispute
                    </Link>
                  )}
                  <Link href={`/safe-deal/${deal.id}`} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                    View details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="mt-6 hidden overflow-x-auto md:block">
          {safeDeals.length === 0 ? emptyState : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-gray-500">
                <tr>
                  <th className="py-3">Listing</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Fee</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Sync</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeDeals.map((deal) => {
                  const status = dealStatus(deal);
                  const canAct = ["FUNDED", "DELIVERED"].includes(status);
                  const isBuyer = deal.buyerId === user?.id;

                  return (
                    <tr key={deal.id} className="border-b last:border-0">
                      <td className="py-4 font-medium text-gray-900">
                        <Link href={`/safe-deal/${deal.id}`} className="hover:text-emerald-800">
                          {deal.listing.title}
                        </Link>
                      </td>
                      <td className="py-4 text-gray-600">{isBuyer ? "Buyer" : "Seller"}</td>
                      <td className="py-4 text-gray-600">{formatMoney(deal.escrowAmountCached ?? deal.amount)}</td>
                      <td className="py-4 text-gray-600">{formatMoney(deal.escrowFeeCached ?? deal.feeAmount)}</td>
                      <td className="py-4 text-gray-600">{status}</td>
                      {/* PL-007: freshness badge column */}
                      <td className="py-4">
                        <div className="flex flex-col gap-1">
                          <EscrowFreshnessBadge freshness={deal.escrowProjection?.freshness} />
                          {deal.disputeProjection?.disputeStatusCached && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              Dispute: {deal.disputeProjection.disputeStatusCached}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {isBuyer && canAct && (
                            <button
                              onClick={() => updateDealStatus(deal.id, "confirm")}
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              Confirm
                            </button>
                          )}
                          {canAct && (
                            <Link href={`/safe-deal/${deal.id}`} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700">
                              Open dispute
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
