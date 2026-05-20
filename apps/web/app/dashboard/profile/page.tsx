import { DashboardShell } from "../../../components/dashboard/dashboard-shell";

export default function ProfilePage() {
  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <p className="mt-2 text-gray-600">User profile and verification status will connect to /users/me next.</p>
      </div>
    </DashboardShell>
  );
}
