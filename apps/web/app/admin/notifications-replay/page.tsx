"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type ReplaySummaryResponse = {
  summary: {
    replayMode: string;
    requestedCount: number;
    duplicateRejectedCount: number;
    rateLimitedCount: number;
    expiredCount: number;
    blockedCount: number;
  };
};

type DeadLetter = {
  id: string;
  failedReason?: string;
  replayMode?: string;
};

type DeadLetterListResponse = {
  deadLetters: DeadLetter[];
};

type ReplayStatusResponse = {
  replayStatus: string;
  replayMode: string;
  auditTrail: Array<{ id: string; action: string; createdAt: string }>;
};

export default function NotificationReplayDashboardPage() {
  const [summary, setSummary] = useState<ReplaySummaryResponse["summary"] | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ReplayStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      const [summaryResult, deadLetterResult] = await Promise.all([
        apiFetch<ReplaySummaryResponse>("/admin/notifications/replay-summary"),
        apiFetch<DeadLetterListResponse>("/admin/notifications/dead-letter")
      ]);

      setSummary(summaryResult.summary);
      setDeadLetters(deadLetterResult.deadLetters);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load notification replay dashboard.");
    }
  }

  async function loadReplayStatus(deadLetterId: string) {
    try {
      const result = await apiFetch<ReplayStatusResponse>(
        `/admin/notifications/dead-letter/${deadLetterId}/replay-status`
      );
      setSelectedStatus(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load replay status.");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Notification Governance</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Replay Operator Dashboard</h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          Read-only operator visibility for governed notification replay. Replay remains manual,
          super-admin controlled, rate-limited, TTL-bound, and idempotency-protected.
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            ["Requested", summary?.requestedCount ?? 0],
            ["Duplicate rejected", summary?.duplicateRejectedCount ?? 0],
            ["Rate limited", summary?.rateLimitedCount ?? 0],
            ["Expired", summary?.expiredCount ?? 0],
            ["Blocked", summary?.blockedCount ?? 0]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-gray-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Dead-Letter Replay Queue</h2>
            <div className="mt-4 space-y-3">
              {deadLetters.length === 0 ? (
                <p className="text-sm text-gray-500">No dead-letter notifications loaded.</p>
              ) : (
                deadLetters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void loadReplayStatus(item.id)}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left text-sm hover:bg-gray-100"
                  >
                    <p className="font-semibold text-gray-900">{item.id}</p>
                    <p className="text-gray-500">
                      {item.replayMode ?? "MANUAL_OPERATOR_REVIEW_REQUIRED"} · {item.failedReason ?? "No failure reason"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Replay Status</h2>
            {!selectedStatus ? (
              <p className="mt-4 text-sm text-gray-500">Select a dead-letter item to inspect replay status.</p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <p className="font-bold text-gray-950">{selectedStatus.replayStatus}</p>
                <p className="text-gray-600">{selectedStatus.replayMode}</p>
                <p className="text-gray-500">Audit events: {selectedStatus.auditTrail.length}</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
