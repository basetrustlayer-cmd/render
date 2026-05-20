"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { StatCard } from "../../components/dashboard/stat-card";
import { apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

type Listing = {
  id: string;
  title: string;
  status: string;
};

type SafeDeal = {
  id: string;
  status: string;
};

type TrustScore = {
  score: number;
  tier: string;
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [listings, setListings] = useState<Listing[]>([]);
  const [safeDeals, setSafeDeals] = useState<SafeDeal[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    async function loadDashboard() {
      try {
        const [listingResult, safeDealResult, trustScoreResult] = await Promise.all([
          apiFetch<{ listings: Listing[] }>("/listings/my"),
          apiFetch<{ safeDeals: SafeDeal[] }>("/safe-deals/my"),
          apiFetch<TrustScore>(`/users/${userId}/trust-score`)
        ]);

        setListings(listingResult.listings);
        setSafeDeals(safeDealResult.safeDeals);
        setTrustScore(trustScoreResult);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      }
    }

    void loadDashboard();
  }, [user?.id]);

  const completedDeals = useMemo(
    () => safeDeals.filter((deal) => ["RELEASED", "COMPLETED"].includes(deal.status)).length,
    [safeDeals]
  );

  return (
    <DashboardShell>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Listings" value={String(listings.length)} helper="Listings owned by this user" />
        <StatCard label="Open Safe Deals" value={String(safeDeals.length)} helper="Buyer or seller escrow deals" />
        <StatCard label="Completed Deals" value={String(completedDeals)} helper="Successful marketplace deals" />
        <StatCard label="Trust Score" value={trustScore ? String(trustScore.score) : "—"} helper={trustScore?.tier ?? "Powered by TrustLayer"} />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!user && (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Login Required</h2>
          <p className="mt-2 text-gray-600">Sign in to view personalized dashboard metrics.</p>
        </div>
      )}
    </DashboardShell>
  );
}
