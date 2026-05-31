"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";

type AdminGateProps = {
  children: React.ReactNode;
};

function getStatus(err: unknown) {
  if (!(err instanceof ApiError)) return null;

  const record = err as unknown as Record<string, unknown>;
  return Number(record.status ?? record.statusCode ?? record.code ?? 0) || null;
}

export default function AdminGate({ children }: AdminGateProps) {
  const [state, setState] = useState<"checking" | "allowed" | "forbidden">("checking");

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        await apiFetch("/admin/audit-logs");
        setState("allowed");
      } catch (err) {
        const status = getStatus(err);

        if (status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        setState("forbidden");
      }
    }

    void checkAdminAccess();
  }, []);

  if (state === "checking") {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-600">Checking admin access...</p>
        </section>
      </main>
    );
  }

  if (state === "forbidden") {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-red-700">403 Forbidden</p>
          <h1 className="mt-2 text-3xl font-black text-gray-950">Admin access required</h1>
          <p className="mt-3 text-sm text-red-800">
            Your account does not have permission to access Render admin operations.
          </p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
