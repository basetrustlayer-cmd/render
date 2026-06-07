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
    function handleInvalidAuth() {
      logout();
      router.replace("/login");
    }

    window.addEventListener("render-auth-invalid", handleInvalidAuth);

    return () => {
      window.removeEventListener("render-auth-invalid", handleInvalidAuth);
    };
  }, [logout, router]);

  useEffect(() => {
    if (!hasHydrated || !user?.id) return;

    async function loadListings() {
      setLoadState("loading");

      try {
        const result = await apiFetch<unknown>("/listings/my");
        const parsedListings = parseDashboardListingsResponse(result);

        if (!parsedListings) {
          setListings([]);
          setLoadState("error");
          return;
        }

        setListings(parsedListings);
        setLoadState("ready");
      } catch (err) {
        setListings([]);

        if (err instanceof ApiError && err.status === 401) {
          logout();
          setLoadState("loginRequired");
          router.replace("/login");
          return;
        }

        if (err instanceof ApiError && err.status === 403) {
          setLoadState("blocked");
          return;
        }

        setLoadState("error");
      }
    }

    void loadListings();
  }, [hasHydrated, logout, router, user?.id]);

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

        {hasHydrated && !user?.id && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-bold text-amber-950">Login required</h3>
            <p className="mt-2 text-sm text-amber-800">
              Sign in to manage your seller listings. You will be redirected safely instead of seeing a server error.
            </p>
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

        {loadState === "loading" && <p className="mt-6 text-sm text-gray-600">Loading your listings…</p>}

        <div className="mt-6 grid gap-4">
          {hasHydrated && user?.id && loadState === "ready" && listings.map((listing) => {
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
                  {listing.status === "LIVE" ? (
                    <Link href={`/listings/${listing.id}`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      View Public
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                      Pending Review
                    </span>
                  )}
                  <Link href={`/dashboard/listings/${listing.id}/edit`} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                    Edit / Photos
                  </Link>
                </div>
              </article>
            );
          })}

          {hasHydrated && user?.id && loadState === "ready" && listings.length === 0 && (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
                No listings yet
              </p>
              <h3 className="mt-2 text-2xl font-black text-gray-950">
                Create your first marketplace listing.
              </h3>
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
