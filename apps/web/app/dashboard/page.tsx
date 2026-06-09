"use client";

import Link from "next/link";
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

// UX-009: reputation roadmap milestones
const MILESTONES = [
  { key: "verified",      label: "Verified",            detail: "Phone or Ghana Card verified" },
  { key: "firstListing",  label: "First listing",       detail: "Unlocks your seller profile" },
  { key: "firstMessage",  label: "First message",       detail: "Buyer interest confirmed" },
  { key: "firstSafeDeal", label: "First Safe Deal",     detail: "Unlocks TrustScore boost + verified review" },
] as const;

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-200" />
      <div className="mt-3 h-7 w-16 rounded bg-gray-200" />
      <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);

  // UX-003: single loading gate
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [safeDeals, setSafeDeals] = useState<SafeDeal[]>([]);
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [hasMessages, setHasMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UX-009: roadmap dismissed state
  const [roadmapDismissed, setRoadmapDismissed] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() { logout(); router.replace("/login"); }
    window.addEventListener("render-auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("render-auth-invalid", handleInvalidAuth);
  }, [logout, router]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    async function loadDashboard() {
      setLoading(true);

      // UX-003: batch all calls, only render once all settle
      const [listingRes, safeDealRes, leadRes, trustRes, msgRes] = await Promise.allSettled([
        apiFetch<{ listings: Listing[] }>("/listings/my"),
        apiFetch<{ safeDeals: SafeDeal[] }>("/safe-deals/my"),
        apiFetch<{ leads: SellerLead[] }>("/leads/my"),
        apiFetch<TrustScore>(`/users/${userId}/trust-score`),
        apiFetch<{ conversations: { messages: { readAt: string | null; senderId: string }[] }[] }>("/conversations/my"),
      ]);

      if (listingRes.status === "fulfilled") {
        setListings(listingRes.value.listings);
        setError(null);
      } else {
        const err = listingRes.reason;
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          logout(); router.replace("/login"); return;
        }
        setError(err instanceof Error ? err.message : "Unable to load listings.");
      }

      if (safeDealRes.status === "fulfilled") setSafeDeals(safeDealRes.value.safeDeals);
      if (leadRes.status === "fulfilled") setLeads(leadRes.value.leads);
      if (trustRes.status === "fulfilled") setTrustScore(trustRes.value);
      if (msgRes.status === "fulfilled") {
        const unread = msgRes.value.conversations.some((c) =>
          c.messages.some((m) => !m.readAt && m.senderId !== userId)
        );
        setHasMessages(unread);
      }

      setLoading(false);
    }

    void loadDashboard();
  }, [logout, router, user?.id]);

  const completedDeals = useMemo(
    () => safeDeals.filter((d) => ["CONFIRMED", "COMPLETE"].includes(d.status)).length,
    [safeDeals]
  );

  const leadPerformance = useMemo(() => {
    const counts = { NEW: 0, CONTACTED: 0, NEGOTIATING: 0, WON: 0, LOST: 0 };
    leads.forEach((lead) => {
      if (lead.status in counts) counts[lead.status as keyof typeof counts] += 1;
    });
    const wonRate = leads.length > 0 ? Math.round((counts.WON / leads.length) * 100) : 0;
    return { counts, wonRate };
  }, [leads]);

  // UX-009: milestone completion state
  const milestoneState = useMemo(() => ({
    verified:      (user?.verificationLevel ?? 0) >= 1,
    firstListing:  listings.length > 0,
    firstMessage:  hasMessages,
    firstSafeDeal: completedDeals > 0,
  }), [user?.verificationLevel, listings.length, hasMessages, completedDeals]);

  const showRoadmap = !roadmapDismissed && !loading && completedDeals === 0;

  return (
    <DashboardShell>

      {/* UX-009: Reputation roadmap — shown until first Safe Deal completes */}
      {showRoadmap && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
          <div className="flex items-start justify-between gap-4 p-5 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Your reputation roadmap</p>
              <h2 className="mt-1 text-base font-black text-gray-950">Complete your first Safe Deal to unlock your full TrustScore</h2>
            </div>
            <button
              onClick={() => setRoadmapDismissed(true)}
              className="shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 transition"
              aria-label="Dismiss roadmap"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-5 pt-2 sm:grid-cols-4">
            {MILESTONES.map((m) => {
              const done = milestoneState[m.key];
              return (
                <div
                  key={m.key}
                  className={`rounded-xl border p-3 ${done ? "border-emerald-300 bg-white" : "border-emerald-100 bg-emerald-50/50"}`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-600 text-white" : "bg-emerald-200 text-emerald-700"}`}>
                    {done ? "✓" : "·"}
                  </div>
                  <p className={`mt-2 text-xs font-bold ${done ? "text-gray-950" : "text-gray-500"}`}>{m.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{m.detail}</p>
                </div>
              );
            })}
          </div>
          {!milestoneState.verified && (
            <div className="border-t border-emerald-200 px-5 py-3">
              <Link href="/verify" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">
                Get verified to start — takes 2 minutes →
              </Link>
            </div>
          )}
          {milestoneState.verified && !milestoneState.firstListing && (
            <div className="border-t border-emerald-200 px-5 py-3">
              <Link href="/dashboard/create-listing" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">
                Create your first listing →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* UX-003: Skeleton loading state */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active Listings" value={String(listings.length)} helper="Listings owned by this user" />
          <StatCard label="New Leads" value={String(leadPerformance.counts.NEW)} helper="Fresh buyer attention" />
          <StatCard label="Negotiating" value={String(leadPerformance.counts.NEGOTIATING)} helper="Active seller follow-up" />
          <StatCard label="Won Rate" value={`${leadPerformance.wonRate}%`} helper={`${leadPerformance.counts.WON} won · ${leadPerformance.counts.LOST} lost`} />
          <StatCard label="Open Safe Deals" value={String(safeDeals.length)} helper="Buyer or seller escrow deals" />
          <StatCard label="Completed Deals" value={String(completedDeals)} helper="Successful marketplace deals" />
          <StatCard label="Trust Score" value={trustScore ? String(trustScore.score) : "—"} helper={trustScore?.tier ?? "Pending TrustLayer sync"} />
        </div>
      )}

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller Performance</p>
        <h2 className="mt-1 text-xl font-black text-gray-950">Lead Pipeline</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {Object.entries(leadPerformance.counts).map(([status, count]) => (
            <div key={status} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">{status}</p>
              <p className="mt-1 text-2xl font-black text-gray-950">{loading ? "—" : count}</p>
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
