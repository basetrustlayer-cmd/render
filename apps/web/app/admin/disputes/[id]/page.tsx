"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../../lib/api";

type DisputeEvent = {
  id: string;
  eventType: string;
  note: string | null;
  createdAt: string;
  actorUserId: string | null;
};

type Dispute = {
  id: string;
  status: string;
  reason: string;
  updatedAt: string;
  safeDeal: {
    id: string;
    escrowStatusCached: string | null;
    disputeStatusCached: string | null;
    disputeReasonCached: string | null;
    disputeLastSyncedAt: string | null;
    listing: { id: string; title: string; price: string; category: string };
    buyer: { phone: string | null; email: string | null; trustScore: number | null; trustTier: string | null };
    seller: { phone: string | null; email: string | null; trustScore: number | null; trustTier: string | null };
  };
  openedBy: { phone: string | null; email: string | null };
  events: DisputeEvent[];
};

const workflowStatuses = ["UNDER_REVIEW", "NEEDS_BUYER_RESPONSE", "NEEDS_SELLER_RESPONSE"];

function getProjectionFreshness(lastSyncedAt: string | null): "MISSING" | "FRESH" | "STALE" {
  if (!lastSyncedAt) return "MISSING";

  const syncedAtMs = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(syncedAtMs)) return "STALE";

  return Date.now() - syncedAtMs <= 30 * 60 * 1000 ? "FRESH" : "STALE";
}

export default function AdminDisputeDetailPage({ params }: { params: { id: string } }) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(workflowStatuses[0]);
  const [statusNote, setStatusNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDispute() {
    const result = await apiFetch<{ dispute: Dispute }>(`/admin/disputes/${params.id}`);
    setDispute(result.dispute);
    setStatus(workflowStatuses.includes(result.dispute.status) ? result.dispute.status : workflowStatuses[0]);
  }

  useEffect(() => {
    loadDispute().catch((err) => {
      setError(err instanceof ApiError ? err.body : "Unable to load dispute.");
    });
  }, [params.id]);

  async function addNote() {
    setError(null);
    setMessage(null);
    await apiFetch(`/admin/disputes/${params.id}/note`, {
      method: "POST",
      body: JSON.stringify({ note })
    });
    setNote("");
    setMessage("Moderator note added.");
    await loadDispute();
  }

  async function updateStatus() {
    setError(null);
    setMessage(null);
    await apiFetch(`/admin/disputes/${params.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note: statusNote || undefined })
    });
    setStatusNote("");
    setMessage("Render workflow status updated.");
    await loadDispute();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-6xl">
        <Link href="/admin/disputes" className="text-sm font-bold text-amber-700">← Back to disputes</Link>

        <h1 className="mt-4 text-3xl font-black text-gray-950">Dispute Detail</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Render moderator actions are workflow-only. Financial resolution remains controlled by TrustLayer.
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</div>}

        {dispute && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-amber-600">{dispute.status}</p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">{dispute.safeDeal.listing.title}</h2>
              <p className="mt-3 text-gray-700">{dispute.reason}</p>

              <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <p>Buyer: {dispute.safeDeal.buyer.phone ?? dispute.safeDeal.buyer.email ?? "Unknown"}</p>
                <p>Seller: {dispute.safeDeal.seller.phone ?? dispute.safeDeal.seller.email ?? "Unknown"}</p>
                <p>Escrow: {dispute.safeDeal.escrowStatusCached ?? "UNKNOWN"}</p>
                <p>TrustLayer dispute status: {dispute.safeDeal.disputeStatusCached ?? "PENDING_PROJECTION"}</p>
                <p>TrustLayer dispute reason: {dispute.safeDeal.disputeReasonCached ?? "NO_REASON_PROJECTED"}</p>
                <p>TrustLayer dispute last synced: {dispute.safeDeal.disputeLastSyncedAt ?? "MISSING"}</p>
                <p>Projection freshness: {getProjectionFreshness(dispute.safeDeal.disputeLastSyncedAt)}</p>
              </div>
            </article>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">Moderator Actions</h2>

              <textarea
                className="mt-4 min-h-28 w-full rounded-xl border border-gray-300 p-3 text-sm"
                placeholder="Add moderator note..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <button
                className="mt-3 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                disabled={note.trim().length < 3}
                onClick={() => addNote().catch((err) => setError(err instanceof ApiError ? err.body : "Unable to add note."))}
              >
                Add Note
              </button>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <select className="w-full rounded-xl border border-gray-300 p-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {workflowStatuses.map((value) => <option key={value}>{value}</option>)}
                </select>
                <textarea
                  className="mt-3 min-h-24 w-full rounded-xl border border-gray-300 p-3 text-sm"
                  placeholder="Optional status note..."
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                />
                <button
                  className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => updateStatus().catch((err) => setError(err instanceof ApiError ? err.body : "Unable to update status."))}
                >
                  Update Workflow Status
                </button>
              </div>
            </aside>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-bold text-gray-950">Event Timeline</h2>
              <div className="mt-4 space-y-3">
                {dispute.events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-100 p-4">
                    <p className="text-sm font-bold text-gray-950">{event.eventType}</p>
                    <p className="mt-1 text-sm text-gray-600">{event.note ?? "No note."}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
