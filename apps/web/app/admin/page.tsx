"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";

type AuditLog = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

type AuditLogsResponse = {
  auditLogs: AuditLog[];
};

const cards = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Review users, suspension status, roles, and verification posture."
  },
  {
    href: "/admin/listings",
    title: "Listing Moderation",
    description: "Approve or reject pending and manual-review listings."
  },
  {
    href: "/admin/reviews",
    title: "Review Moderation",
    description: "Inspect reported reviews and remove abusive or fraudulent reputation content."
  },
  {
    href: "/admin/safe-deals",
    title: "Disputed Safe Deals",
    description: "Review escrow disputes that require operations attention."
  },
  {
    href: "/admin/audit-logs",
    title: "Audit Logs",
    description: "Inspect privileged actions and security-sensitive events."
  },
  {
    href: "/admin/notifications-replay",
    title: "Notification Replay",
    description: "Inspect governed notification replay controls, dead-letter status, and replay governance outcomes."
  }
];

export default function AdminPage() {
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecentLogs() {
      try {
        const result = await apiFetch<AuditLogsResponse>("/admin/audit-logs");
        setRecentLogs(result.auditLogs.slice(0, 5));
      } catch (err) {
        setError(err instanceof ApiError ? "Admin access required." : "Unable to load admin data.");
      }
    }

    void loadRecentLogs();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Render Operations</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Admin Control Center</h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          Moderate marketplace trust, user safety, disputed escrow transactions, and audit visibility.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-gray-950">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{card.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Recent Audit Events</h2>
          <div className="mt-4 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No recent audit events loaded.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{log.action}</p>
                  <p className="text-gray-500">
                    {log.entityType ?? "SYSTEM"} {log.entityId ? `· ${log.entityId}` : ""} ·{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
