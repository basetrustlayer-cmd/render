"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type AuditLog = {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminAuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const result = await apiFetch<{ auditLogs: AuditLog[] }>("/admin/audit-logs");
        setAuditLogs(result.auditLogs);
      } catch (err) {
        setError(err instanceof ApiError ? err.body : "Unable to load audit logs.");
      }
    }

    void loadLogs();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-black text-gray-950">Audit Logs</h1>
        <p className="mt-2 text-gray-600">Recent security and operational events.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Entity</th>
                <th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-semibold text-gray-900">{log.action}</td>
                  <td className="p-3">{log.actorUserId ?? "SYSTEM"}</td>
                  <td className="p-3">
                    {log.entityType ?? "-"} {log.entityId ? `· ${log.entityId}` : ""}
                  </td>
                  <td className="p-3">{log.ipAddress ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
