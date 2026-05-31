"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type DuplicateUser = {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  isSuspended: boolean;
  createdAt: string;
  _count: {
    listings: number;
    authSessions: number;
    purchases: number;
    sales: number;
    reviewsGiven: number;
    reviewsReceived: number;
    messagesSent: number;
  };
};

type DuplicateGroup = {
  phone: string | null;
  count: number;
  users: DuplicateUser[];
};

type DuplicateReportResponse = {
  duplicatePhoneGroups: number;
  impactedAccounts: number;
  duplicates: DuplicateGroup[];
};

export default function IdentityGovernancePage() {
  const [report, setReport] = useState<DuplicateReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    try {
      const result = await apiFetch<DuplicateReportResponse>("/admin/users/duplicates");
      setReport(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load duplicate identity report.");
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-600">Identity Governance</p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">Duplicate Identity Report</h1>
        <p className="mt-3 max-w-3xl text-gray-600">
          Read-only operational report for duplicate phone identities. This page does not merge,
          delete, or mutate user accounts.
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {!report && !error && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
            Loading duplicate identity report...
          </div>
        )}

        {report && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SummaryCard label="Duplicate Phone Groups" value={report.duplicatePhoneGroups} />
              <SummaryCard label="Impacted Accounts" value={report.impactedAccounts} />
            </div>

            <div className="mt-6 space-y-5">
              {report.duplicates.length === 0 ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
                  No duplicate phone identities detected.
                </div>
              ) : (
                report.duplicates.map((group) => (
                  <section key={group.phone ?? "missing-phone"} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black text-gray-950">{group.phone ?? "Missing phone"}</h2>
                        <p className="text-sm text-amber-700">{group.count} accounts share this phone number.</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
                        Review Required
                      </span>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Activity Footprint</th>
                            <th className="p-3">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.users.map((user) => (
                            <tr key={user.id} className="border-t border-gray-100">
                              <td className="p-3">
                                <p className="font-semibold text-gray-900">{user.email ?? user.phone ?? user.id}</p>
                                <p className="text-xs text-gray-500">{user.id}</p>
                              </td>
                              <td className="p-3">{user.role}</td>
                              <td className="p-3">{user.isSuspended ? "Suspended" : "Active"}</td>
                              <td className="p-3 text-xs text-gray-600">
                                Listings {user._count.listings} · Sessions {user._count.authSessions} · Purchases {user._count.purchases} · Sales {user._count.sales} · Reviews {user._count.reviewsGiven + user._count.reviewsReceived} · Messages {user._count.messagesSent}
                              </td>
                              <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-gray-950">{value}</p>
    </div>
  );
}
