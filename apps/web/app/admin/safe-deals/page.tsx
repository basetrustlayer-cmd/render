"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type DisputedDeal = {
  id: string;
  amount: string;
  status: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
  };
  buyer: {
    phone: string | null;
    email: string | null;
  };
  seller: {
    phone: string | null;
    email: string | null;
  };
};

export default function AdminSafeDealsPage() {
  const [safeDeals, setSafeDeals] = useState<DisputedDeal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeals() {
      try {
        const result = await apiFetch<{ safeDeals: DisputedDeal[] }>("/admin/safe-deals/disputed");
        setSafeDeals(result.safeDeals);
      } catch (err) {
        setError(err instanceof ApiError ? err.body : "Unable to load disputed Safe Deals.");
      }
    }

    void loadDeals();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black text-gray-950">Disputed Safe Deals</h1>
        <p className="mt-2 text-gray-600">Operational queue for disputed escrow transactions.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4">
          {safeDeals.map((deal) => (
            <article key={deal.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-red-600">{deal.status}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">{deal.listing.title}</h2>
              <p className="mt-2 text-sm text-gray-600">Amount: GHS {deal.amount}</p>
              <p className="mt-1 text-sm text-gray-600">
                Buyer: {deal.buyer.phone ?? deal.buyer.email ?? "Unknown"} · Seller:{" "}
                {deal.seller.phone ?? deal.seller.email ?? "Unknown"}
              </p>
              <p className="mt-1 text-xs text-gray-500">Updated {new Date(deal.updatedAt).toLocaleString()}</p>
            </article>
          ))}

          {safeDeals.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              No disputed Safe Deals.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
