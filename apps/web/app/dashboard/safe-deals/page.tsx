"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

function projectionBadge(label: string, freshness?: string) {
  const value = freshness ?? "UNKNOWN";
  return `${label}: ${value}`;
}

function dealStatus(deal: SafeDeal): string {
  return deal.escrowStatusCached ?? deal.status ?? "PENDING";
}

function dealAmount(deal: SafeDeal): string {
  return deal.escrowAmountCached ?? deal.amount ?? "0.00";
}

function dealFee(deal: SafeDeal): string {
  return deal.escrowFeeCached ?? deal.feeAmount ?? "0.00";
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
  listing: {
    id: string;
    title: string;
    category: string;
  };
};

export default function SafeDealsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [safeDeals, setSafeDeals] = useState<SafeDeal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function loadSafeDeals() {
    try {
      const result = await apiFetch<{ safeDeals: SafeDeal[] }>("/safe-deals/my");
      setSafeDeals(result.safeDeals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Safe Deals.");
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    void loadSafeDeals();
  }, [user?.id]);

  async function updateDealStatus(id: string, action: "confirm" | "dispute") {
    setError(null);

    try {
      await apiFetch(`/safe-deals/${id}/${action}`, {
        method: "POST"
      });
      await loadSafeDeals();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${action} Safe Deal.`);
    }
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Safe Deals</h2>
        <p className="mt-1 text-gray-600">Escrow-protected transactions where this user is buyer or seller.</p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-3">Listing</th>
                <th className="py-3">Role</th>
                <th className="py-3">Amount</th>
                <th className="py-3">Fee</th>
                <th className="py-3">Status</th>
                <th className="py-3">Projection</th>
                    <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeDeals.map((deal) => (
                <tr key={deal.id} className="border-b last:border-0">
                  <td className="py-4 font-medium text-gray-900">{deal.listing.title}</td>
                  <td className="py-4 text-gray-600">{deal.buyerId === user?.id ? "Buyer" : "Seller"}</td>
                  <td className="py-4 text-gray-600">GHS {dealAmount(deal)}</td>
                  <td className="py-4 text-gray-600">GHS {dealFee(deal)}</td>
                  <td className="py-4 text-gray-600">{dealStatus(deal)}</td>
                    <td className="py-4 text-xs text-gray-500">
                      <p>{projectionBadge("Escrow", deal.escrowProjection?.freshness)}</p>
                      <p>{projectionBadge("Dispute", deal.disputeProjection?.freshness)}</p>
                      {deal.disputeProjection?.disputeStatusCached && (
                        <p className="text-red-700">Dispute: {deal.disputeProjection.disputeStatusCached}</p>
                      )}
                    </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {deal.buyerId === user?.id && ["FUNDED", "DELIVERED"].includes(dealStatus(deal)) && (
                        <button
                          onClick={() => updateDealStatus(deal.id, "confirm")}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Confirm
                        </button>
                      )}

                      {["FUNDED", "DELIVERED"].includes(dealStatus(deal)) && (
                        <button
                          onClick={() => updateDealStatus(deal.id, "dispute")}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          Dispute
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {safeDeals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No Safe Deals found for this user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
