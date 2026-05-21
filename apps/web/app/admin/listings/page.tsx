"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    phone: string | null;
    verificationLevel: number;
    trustTier: string | null;
    isSuspended: boolean;
  };
};

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadListings() {
    try {
      const result = await apiFetch<{ listings: Listing[] }>("/admin/listings/pending");
      setListings(result.listings);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : "Unable to load listings.");
    }
  }

  async function approve(id: string) {
    await apiFetch(`/admin/listings/${id}/approve`, { method: "POST" });
    await loadListings();
  }

  async function reject(id: string) {
    const reason = prompt("Rejection reason");
    if (!reason) return;

    await apiFetch(`/admin/listings/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });

    await loadListings();
  }

  useEffect(() => {
    void loadListings();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <section className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black text-gray-950">Listing Moderation</h1>
        <p className="mt-2 text-gray-600">Approve or reject pending marketplace listings.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4">
          {listings.map((listing) => (
            <article key={listing.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-amber-600">{listing.status}</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-950">{listing.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {listing.category} · GHS {listing.price} · Seller {listing.seller.phone ?? listing.seller.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-green-700 px-4 py-2 text-white" onClick={() => void approve(listing.id)}>
                    Approve
                  </button>
                  <button className="rounded-lg bg-red-700 px-4 py-2 text-white" onClick={() => void reject(listing.id)}>
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}

          {listings.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500">
              No pending listings.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
