import { DashboardShell } from "../../../components/dashboard/dashboard-shell";

export default function CreateListingPage() {
  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
        <p className="mt-2 text-gray-600">Create-listing form will be wired to POST /listings next.</p>
      </div>
    </DashboardShell>
  );
}
