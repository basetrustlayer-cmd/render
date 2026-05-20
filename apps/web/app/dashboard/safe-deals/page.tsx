"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type SafeDeal = {
  id: string;
  amount: string;
  feeAmount: string;
  status: string;
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

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    async function loadSafeDeals() {
      try {
        const result = await apiFetch<{ safeDeals: SafeDeal[] }>(`/safe-deals/my?userId=${userId}`);
        setSafeDeals(result.safeDeals);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load Safe Deals.");
      }
    }

    void loadSafeDeals();
  }, [user?.id]);

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
              </tr>
            </thead>
            <tbody>
              {safeDeals.map((deal) => (
                <tr key={deal.id} className="border-b last:border-0">
                  <td className="py-4 font-medium text-gray-900">{deal.listing.title}</td>
                  <td className="py-4 text-gray-600">{deal.buyerId === user?.id ? "Buyer" : "Seller"}</td>
                  <td className="py-4 text-gray-600">GHS {deal.amount}</td>
                  <td className="py-4 text-gray-600">GHS {deal.feeAmount}</td>
                  <td className="py-4 text-gray-600">{deal.status}</td>
                </tr>
              ))}
              {safeDeals.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
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
