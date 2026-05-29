"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type LaunchDashboardResponse = {
  generatedAt?: string;
  status?: string;
  launchReadiness?: unknown;
  sloSummary?: unknown;
  operationalAlerts?: unknown;
  links?: Record<string, string>;
};

export default function AdminOperationsPage() {
  const [dashboard, setDashboard] = useState<LaunchDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const result = await apiFetch<LaunchDashboardResponse>("/admin/operations/launch-dashboard");
        setDashboard(result);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? "Admin access required." : "Unable to load launch operations.");
      }
    }

    void loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Launch Operations</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Launch Readiness Dashboard</h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          Computed operational readiness view for launch review. This page reads existing operational signals only.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!dashboard && !error && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
            Loading launch operations...
          </div>
        )}

        {dashboard && (
          <div className="mt-6 grid gap-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">Launch Status</h2>
              <p className="mt-2 text-sm text-gray-600">
                Generated: {dashboard.generatedAt ? new Date(dashboard.generatedAt).toLocaleString() : "Unknown"}
              </p>
              <p className="mt-2 text-2xl font-black text-gray-950">{dashboard.status ?? "UNKNOWN"}</p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-gray-950">Computed Readiness Payload</h2>
              <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-gray-100">
                {JSON.stringify(dashboard, null, 2)}
              </pre>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
