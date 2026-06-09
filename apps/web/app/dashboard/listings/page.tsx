"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { ApiError, apiFetch } from "../../../lib/api";
import { parseDashboardListingsResponse, type Listing } from "../../../lib/dashboard-listings";
import { useAuthStore } from "../../../store/auth";

type ListingsLoadState = "idle" | "loading" | "ready" | "loginRequired" | "blocked" | "error";

export default function DashboardListingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadState, setLoadState] = useState<ListingsLoadState>("idle");

  useEffect(() => {
    hydrate();
    setHasHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() { logout(); router.replace("/login"); }
    window.addEventListener("render-auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("render-auth-invalid", handleInvalidAuth);
  }, [logout, router]);

  useEffect(() => {
    if (!hasHydrated || !user?.id) return;

    async function loadListings() {
      setLoadState("loading");
      try {
        const result = await apiFetch<unknown>("/listings/my");
        const parsedListings = parseDashboardListingsResponse(result);
        if (!parsedListings) { setListings([]); setLoadState("error"); return; }
        setListings(parsedListings);
        setLoadState("ready");
      } catch (err) {
        setListings([]);
        if (err instanceof ApiError && err.status === 401) { logout(); setLoadState("loginRequired"); router.replace("/login"); return; }
        if (err instanceof ApiError && err.status === 403) { setLoadState("blocked"); return; }
        setLoadState("error");
      }
    }

    void loadListings();
  }, [hasHydrated, logout, router, user?.id]);

  // PL-004: count pending listings for the banner
  const pendingListings = listings.filter((l) => l.status === "PENDING");

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

        {/* PL-004: amber banner when any listings are stuck in PENDING */}
        {loadState === "ready" && pendingListings.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">
              {pendingListings.length === 1
                ? "1 listing is waiting to be published"
                : `${pendingListings.length} listings are waiting to be published`}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Add a cover photo and publish to make {pendingListings.length === 1 ? "it" : "them"} visible to buyers.
            </p>
          </div>
        )}

        {hasHydrated && !user?.id && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-bold text-amber-950">Login required</h3>
            <p className="mt-2 text-sm text-amber-800">Sign in to manage your seller listings.</p>
            <Link href="/login" className="mt-4 inline-flex rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black">
              Go to login
            </Link>
          </div>
        )}

        {loadState === "loginRequired" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Your session expired. Redirecting you to login…
          </div>
        )}

        {loadState === "blocked" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-bold text-amber-950">Seller access blocked</h3>
            <p className="mt-2 text-sm text-amber-800">
              Your account is blocked or suspended from managing listings. Contact support if this looks incorrect.
            </p>
          </div>
        )}

        {loadState === "error" && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Unable to load listings right now.
          </div>
        )}

        {loadState === "loading" && (
          <p className="mt-6 text-sm text-gray-600">Loading your listings…</p>
        )}

        <div className="mt-6 grid gap-4">
          {hasHydrated && user?.id && loadState === "ready" && listings.map((listing) => {
            const cover = listing.images?.find((img) => img.isCover) ?? listing.images?.[0];
            const isPending = listing.status === "PENDING";

            return (
              <article
                key={listing.id}
                className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[96px_1fr_auto] ${
                  isPending ? "border-amber-200 bg-amber-50/40" : "border-gray-200"
                }`}
              >
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
                    {listing.category} · GH₵ {listing.price} · {listing.viewsCount} views
                  </p>
                  {/* PL-004: clear status label */}
                  {isPending ? (
                    <p className="mt-1.5 text-xs font-bold text-amber-700">
                      ⚠ Not live — add a photo and publish to make this visible to buyers
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                      {listing.status === "LIVE" ? "✓ Live" : listing.status}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {/* PL-004: Publish CTA for PENDING listings */}
                  {isPending ? (
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="rounded-lg border border-amber-400 bg-amber-500 px-4 py-2 text-sm font-bold text-gray-950 hover:bg-amber-400"
                    >
                      Publish listing →
                    </Link>
                  ) : listing.status === "LIVE" ? (
                    <Link
                      href={`/listings/${listing.id}`}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      View public
                    </Link>
                  ) : null}
                  <Link
                    href={`/dashboard/listings/${listing.id}/edit`}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    Edit / Photos
                  </Link>
                </div>
              </article>
            );
          })}

          {hasHydrated && user?.id && loadState === "ready" && listings.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">No listings yet</p>
              <h3 className="mt-2 text-2xl font-black text-gray-950">Create your first marketplace listing.</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
                Add photos, pricing, category, and region so buyers can discover and contact you.
              </p>
              <Link href="/dashboard/create-listing" className="mt-6 inline-flex rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black">
                Create Listing
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
