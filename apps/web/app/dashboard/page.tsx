"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { StatCard } from "../../components/dashboard/stat-card";
import { ApiError, apiFetch } from "../../lib/api";
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

type SellerLead = {
  id: string;
  status: "NEW" | "CONTACTED" | "NEGOTIATING" | "WON" | "LOST" | string;
};

type TrustScore = {
  score: number;
  tier: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);

  const [listings, setListings] = useState<Listing[]>([]);
  const [safeDeals, setSafeDeals] = useState<SafeDeal[]>([]);
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() {
      logout();
      router.replace("/login");
    }

    window.addEventListener("render-auth-invalid", handleInvalidAuth);

    return () => {
      window.removeEventListener("render-auth-invalid", handleInvalidAuth);
    };
  }, [logout, router]);

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    async function loadDashboard() {
      try {
        const listingResult = await apiFetch<{ listings: Listing[] }>("/listings/my");
        setListings(listingResult.listings);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          logout();
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load listings.");
      }

      try {
        const safeDealResult = await apiFetch<{ safeDeals: SafeDeal[] }>("/safe-deals/my");
        setSafeDeals(safeDealResult.safeDeals);
      } catch {
        setSafeDeals([]);
      }

      try {
        const leadResult = await apiFetch<{ leads: SellerLead[] }>("/leads/my");
        setLeads(leadResult.leads);
      } catch {
        setLeads([]);
      }

      try {
        const trustScoreResult = await apiFetch<TrustScore>(`/users/${userId}/trust-score`);
        setTrustScore(trustScoreResult);
      } catch {
        setTrustScore(null);
      }
    }

    void loadDashboard();
  }, [logout, router, user?.id]);

  const completedDeals = useMemo(
    () => safeDeals.filter((deal) => ["CONFIRMED", "COMPLETE"].includes(deal.status)).length,
    [safeDeals]
  );

  const leadPerformance = useMemo(() => {
    const counts = {
      NEW: 0,
      CONTACTED: 0,
      NEGOTIATING: 0,
      WON: 0,
      LOST: 0
    };

    leads.forEach((lead) => {
      if (lead.status in counts) {
        counts[lead.status as keyof typeof counts] += 1;
      }
    });

    const wonRate = leads.length > 0 ? Math.round((counts.WON / leads.length) * 100) : 0;

    return { counts, wonRate };
  }, [leads]);

  return (
    <DashboardShell>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Listings" value={String(listings.length)} helper="Listings owned by this user" />
        <StatCard label="New Leads" value={String(leadPerformance.counts.NEW)} helper="Fresh buyer attention" />
        <StatCard label="Negotiating" value={String(leadPerformance.counts.NEGOTIATING)} helper="Active seller follow-up" />
        <StatCard label="Won Rate" value={`${leadPerformance.wonRate}%`} helper={`${leadPerformance.counts.WON} won · ${leadPerformance.counts.LOST} lost`} />
        <StatCard label="Open Safe Deals" value={String(safeDeals.length)} helper="Buyer or seller escrow deals" />
        <StatCard label="Completed Deals" value={String(completedDeals)} helper="Successful marketplace deals" />
        <StatCard label="Trust Score" value={trustScore ? String(trustScore.score) : "—"} helper={trustScore?.tier ?? "Pending TrustLayer sync"} />
      </div>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller Performance</p>
        <h2 className="mt-1 text-xl font-black text-gray-950">Lead Pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {Object.entries(leadPerformance.counts).map(([status, count]) => (
            <div key={status} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">{status}</p>
              <p className="mt-1 text-2xl font-black text-gray-950">{count}</p>
            </div>
          ))}
        </div>
      </section>

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
