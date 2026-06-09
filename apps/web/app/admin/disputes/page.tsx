"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type Dispute = {
  id: string;
  status: string;
  reason: string;
  updatedAt: string;
  safeDeal: {
    id: string;
    escrowStatusCached: string | null;
    disputeStatusCached: string | null;
    disputeLastSyncedAt: string | null;
    listing: {
      id: string;
      title: string;
      price: string;
      category: string;
    };
    buyer: {
      phone: string | null;
      email: string | null;
      trustScore: number | null;
      trustTier: string | null;
    };
    seller: {
      phone: string | null;
      email: string | null;
      trustScore: number | null;
      trustTier: string | null;
    };
  };
  openedBy: {
    phone: string | null;
    email: string | null;
  };
  events: Array<{
    id: string;
    eventType: string;
    note: string | null;
    createdAt: string;
  }>;
};

type FreshnessFilter = "ALL" | "STALE" | "FRESH";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FreshnessFilter>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDisputes() {
      setLoading(true);
      setError(null);
      try {
        // PL-001: removed hardcoded STALE filter — fetch all disputes by default
        const params = filter !== "ALL"
          ? `?disputeProjectionFreshness=${filter}`
          : "";
        const result = await apiFetch<{ disputes: Dispute[] }>(
          `/admin/disputes${params}`
        );
        setDisputes(result.disputes);
      } catch (err) {
        setError(err instanceof ApiError ? err.body : "Unable to load disputes.");
      } finally {
        setLoading(false);
      }
    }

    void loadDisputes();
  }, [filter]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Render Moderation Workflow</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Dispute Administration</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Review projected disputes, moderator notes, and non-authoritative Render workflow status. TrustLayer remains authoritative for financial resolution.
        </p>

        {/* PL-001: filter toolbar — default ALL so fresh disputes are visible */}
        <div className="mt-5 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">Show:</span>
          {(["ALL", "FRESH", "STALE"] as FreshnessFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                filter === f
                  ? "bg-gray-950 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "ALL" ? "All disputes" : f === "FRESH" ? "Fresh" : "Stale"}
            </button>
          ))}
          {!loading && (
            <span className="ml-auto text-sm text-gray-400">
              {disputes.length} dispute{disputes.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
            Loading disputes…
          </div>
        )}

        {!loading && (
          <div className="mt-6 grid gap-4">
            {disputes
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((dispute) => (
                <Link
                  key={dispute.id}
                  href={`/admin/disputes/${dispute.id}`}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-amber-600">{dispute.status}</p>
                      <h2 className="mt-1 text-xl font-bold text-gray-950">{dispute.safeDeal.listing.title}</h2>
                      <p className="mt-2 text-sm text-gray-600">{dispute.reason}</p>
                    </div>
                    <div className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                      TrustLayer: {dispute.safeDeal.disputeStatusCached ?? "PENDING_PROJECTION"}
                      {" · Sync: "}
                      {dispute.safeDeal.disputeLastSyncedAt ?? "MISSING"}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <p>Buyer: {dispute.safeDeal.buyer.phone ?? dispute.safeDeal.buyer.email ?? "Unknown"} · {dispute.safeDeal.buyer.trustTier ?? "Unscored"}</p>
                    <p>Seller: {dispute.safeDeal.seller.phone ?? dispute.safeDeal.seller.email ?? "Unknown"} · {dispute.safeDeal.seller.trustTier ?? "Unscored"}</p>
                    <p>Escrow projection: {dispute.safeDeal.escrowStatusCached ?? "UNKNOWN"}</p>
                    <p>Updated: {new Date(dispute.updatedAt).toLocaleString()}</p>
                  </div>
                </Link>
              ))}

            {disputes.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
                No disputes found{filter !== "ALL" ? ` for filter: ${filter}` : ""}.
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
