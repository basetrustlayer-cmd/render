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
};

export default function DashboardListingsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

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
            <p className="mt-1 text-gray-600">Manage marketplace inventory.</p>
          </div>
          <Link href="/dashboard/create-listing" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
            New Listing
          </Link>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-3">Title</th>
                <th className="py-3">Category</th>
                <th className="py-3">Price</th>
                <th className="py-3">Status</th>
                <th className="py-3">Views</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b last:border-0">
                  <td className="py-4 font-medium text-gray-900">{listing.title}</td>
                  <td className="py-4 text-gray-600">{listing.category}</td>
                  <td className="py-4 text-gray-600">GHS {listing.price}</td>
                  <td className="py-4 text-gray-600">{listing.status}</td>
                  <td className="py-4 text-gray-600">{listing.viewsCount}</td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No listings found for this user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
