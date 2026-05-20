"use client";

import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { StatCard } from "../../components/dashboard/stat-card";
import { useAuthStore } from "../../store/auth";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardShell>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Listings" value="0" helper="Listings currently live" />
        <StatCard label="Open Safe Deals" value="0" helper="Escrow-protected transactions" />
        <StatCard label="Completed Deals" value="0" helper="Successful marketplace deals" />
        <StatCard label="Trust Score" value="—" helper="Powered by TrustLayer" />
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Signed-in User</h2>
        <pre className="mt-4 overflow-auto rounded-xl bg-gray-100 p-4 text-sm">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </DashboardShell>
  );
}
