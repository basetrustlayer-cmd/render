"use client";

import { useAuthStore } from "../../store/auth";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">Dashboard</h1>

      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
    </main>
  );
}
