"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  status: string;
  viewsCount: number;
  createdAt: string;
  images?: { id: string; url: string; isCover: boolean }[];
};

export default function DashboardListingsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadListings() {
      try {
        const result = await apiFetch<{ listings: Listing[] }>("/listings/my");
        setListings(result.listings);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load listings.");
      }
    }

    void loadListings();
  }, [user?.id]);

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Listings</h2>
            <p className="mt-1 text-gray-600">Manage marketplace inventory and listing photos.</p>
          </div>
          <Link href="/dashboard/create-listing" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
            New Listing
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-4">
          {listings.map((listing) => {
            const cover = listing.images?.find((image) => image.isCover) ?? listing.images?.[0];

            return (
              <article key={listing.id} className="grid gap-4 rounded-2xl border border-gray-200 p-4 md:grid-cols-[96px_1fr_auto]">
                {cover ? (
                  <img src={cover.url} alt={listing.title} className="h-24 w-24 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
                    No photo
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-gray-900">{listing.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {listing.category} · GHS {listing.price} · {listing.status} · {listing.viewsCount} views
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Link href={`/listings/${listing.id}`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    View
                  </Link>
                  <Link href={`/dashboard/listings/${listing.id}/edit`} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                    Manage Photos
                  </Link>
                </div>
              </article>
            );
          })}

          {listings.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-8 text-center text-gray-500">
              No listings found for this user.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
