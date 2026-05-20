import { DashboardShell } from "../../../components/dashboard/dashboard-shell";

export default function DashboardListingsPage() {
  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">My Listings</h2>
        <p className="mt-2 text-gray-600">Listing management table will connect to the live listings API next.</p>
      </div>
    </DashboardShell>
  );
}
