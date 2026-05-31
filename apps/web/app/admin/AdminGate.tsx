"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";

type State = "checking" | "allowed" | "forbidden";

function statusOf(err: unknown): number | null {
  if (!(err instanceof ApiError)) return null;
  const value = err as unknown as { status?: number; statusCode?: number };
  return value.status ?? value.statusCode ?? null;
}

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    async function verify() {
      try {
        await apiFetch("/admin/audit-logs");
        setState("allowed");
      } catch (err) {
        const status = statusOf(err);

        if (status === 401 || status === null) {
          window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }

        setState("forbidden");
      }
    }

    void verify();
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
