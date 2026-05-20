import { DashboardShell } from "../../../components/dashboard/dashboard-shell";

export default function SafeDealsPage() {
  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Safe Deals</h2>
        <p className="mt-2 text-gray-600">Safe Deal records will connect to the backend escrow API next.</p>
      </div>
    </DashboardShell>
  );
}
