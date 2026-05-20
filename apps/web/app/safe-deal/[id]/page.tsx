"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type SafeDeal = {
  id: string;
  amount: string;
  feeAmount: string;
  status: string;
  buyerId: string;
  sellerId: string;
  listing: { id: string; title: string };
};

export default function SafeDealDetailPage({ params }: { params: { id: string } }) {
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [safeDeal, setSafeDeal] = useState<SafeDeal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const result = await apiFetch<{ safeDeal: SafeDeal }>(`/safe-deals/${params.id}`);
      setSafeDeal(result.safeDeal);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Safe Deal.");
    }
  }

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (user?.id) void load();
  }, [user?.id]);

  async function action(type: "confirm" | "dispute") {
    try {
      await apiFetch(`/safe-deals/${params.id}/${type}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/dashboard/safe-deals" className="text-sm underline">← Back to Safe Deals</Link>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">Safe Deal</h1>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {safeDeal && (
          <div className="mt-6 grid gap-4">
            <p><strong>Listing:</strong> {safeDeal.listing.title}</p>
            <p><strong>Amount:</strong> GHS {safeDeal.amount}</p>
            <p><strong>Fee:</strong> GHS {safeDeal.feeAmount}</p>
            <p><strong>Status:</strong> {safeDeal.status}</p>

            <div className="mt-4 flex gap-3">
              {safeDeal.buyerId === user?.id && ["FUNDED", "DELIVERED"].includes(safeDeal.status) && (
                <button onClick={() => action("confirm")} className="rounded bg-emerald-700 px-4 py-2 text-white">
                  Confirm Delivery
                </button>
              )}

              {["FUNDED", "DELIVERED"].includes(safeDeal.status) && (
                <button onClick={() => action("dispute")} className="rounded border border-red-300 px-4 py-2 text-red-700">
                  Open Dispute
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
