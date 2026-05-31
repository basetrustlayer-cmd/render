"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type AdminUser = {
  id: string;
  phone: string | null;
  email: string | null;
  emailMarketingOptIn?: boolean;
  emailVerifiedAt?: string | null;
  googleAccountId?: string | null;
  duplicatePhoneCount?: number;
  isDuplicatePhone?: boolean;
  role: string;
  verificationLevel: number;
  trustScore: number | null;
  trustTier: string | null;
  updatedAt?: string | null;
  isBusiness: boolean;
  isSuspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
};


function formatTrustFreshness(value?: string | null) {
  return value ? `Trust data updated ${new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Trust data sync pending";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const result = await apiFetch<{ users: AdminUser[] }>("/admin/users");
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load users.");
    }
  }

  async function suspendUser(id: string) {
    const reason = prompt("Suspension reason");
    if (!reason) return;

    await apiFetch(`/admin/users/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });

    await loadUsers();
  }

  async function unsuspendUser(id: string) {
    await apiFetch(`/admin/users/${id}/unsuspend`, {
      method: "POST"
    });

    await loadUsers();
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-black text-gray-950">Users</h1>
        <p className="mt-2 text-gray-600">Admin user review and suspension controls.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Trust</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="p-3">
                    <p className="font-semibold text-gray-900">{user.phone ?? user.email ?? user.id}</p>
                    {user.isDuplicatePhone && (
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                        Duplicate phone ×{user.duplicatePhoneCount}
                      </span>
                    )}
                    <p className="mt-1 text-xs text-gray-500">{user.id}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{user.email ?? "Missing email"}</p>
                    <p className="text-xs text-gray-500">
                      {user.emailVerifiedAt ? "Verified" : "Unverified"} · {user.emailMarketingOptIn ? "Marketing opt-in" : "No marketing opt-in"}
                    </p>
                    {user.googleAccountId && <p className="text-xs text-gray-500">Google linked</p>}
                  </td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">
                    L{user.verificationLevel} · {user.trustTier ?? "Pending"} · {user.trustScore ?? "Pending"}
                    <span className="block text-xs text-gray-500">{formatTrustFreshness(user.updatedAt)}</span>
                  </td>
                  <td className="p-3">{user.isSuspended ? "Suspended" : "Active"}</td>
                  <td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    {user.isSuspended ? (
                      <button className="rounded-lg bg-green-700 px-3 py-2 text-white" onClick={() => void unsuspendUser(user.id)}>
                        Unsuspend
                      </button>
                    ) : (
                      <button className="rounded-lg bg-red-700 px-3 py-2 text-white" onClick={() => void suspendUser(user.id)}>
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
