"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../lib/api";

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  price: string;
  category: string;
  status: string;
  createdAt: string;
  images?: Array<{
    id: string;
    url: string;
    isCover: boolean;
  }>;
  seller: {
    id: string;
    phone: string | null;
    verificationLevel: number;
    trustScore: number | null;
    trustTier: string | null;
    isSuspended: boolean;
  };
};

function sellerLabel(listing: Listing) {
  return listing.seller.phone ?? listing.seller.id;
}

function coverImage(listing: Listing) {
  return listing.images?.find((image) => image.isCover) ?? listing.images?.[0] ?? null;
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadListings() {
    try {
      const result = await apiFetch<{ listings: Listing[] }>("/admin/listings/pending");
      setListings(result.listings);
      setError(null);
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
        <p className="mt-2 text-gray-600">
          Review seller identity, trust signals, listing details, and images before approval.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {listings.map((listing) => {
            const image = coverImage(listing);

            return (
              <article key={listing.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  {image ? (
                    <img
                      src={image.url}
                      alt={listing.title}
                      className="h-56 w-full object-cover md:h-full"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-500 md:h-full">
                      No image
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-amber-600">
                          {listing.status}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-gray-950">
                          {listing.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {listing.category} · GHS {listing.price}
                        </p>
                        {listing.description ? (
                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                            {listing.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="rounded-lg bg-green-700 px-4 py-2 text-white"
                          onClick={() => void approve(listing.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-lg bg-red-700 px-4 py-2 text-white"
                          onClick={() => void reject(listing.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">Seller</p>
                        <p className="mt-1 font-semibold text-gray-900">{sellerLabel(listing)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">Verification</p>
                        <p className="mt-1 font-semibold text-gray-900">Level {listing.seller.verificationLevel}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">Trust</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {listing.seller.trustTier ?? "Pending"} · {listing.seller.trustScore ?? "No score"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">Seller status</p>
                        <p className={listing.seller.isSuspended ? "mt-1 font-semibold text-red-700" : "mt-1 font-semibold text-emerald-700"}>
                          {listing.seller.isSuspended ? "Suspended" : "Active"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

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
