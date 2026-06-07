"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TrustScoreBadge } from "./trust-score-badge";
import { VerificationBadge } from "./verification-badge";
import { ListingMessageButton } from "./listing-message-button";
import { ListingSafeDealButton } from "./listing-safe-deal-button";
import { useAuthStore } from "../store/auth";
import type { Listing } from "../lib/get-listings";

type ListingCardProps = {
  listing: Listing;
  imageHeightClass?: string;
};

function resolveCoverImage(listing: Listing): string | undefined {
  return (
    listing.images?.find((image) => image.isCover)?.url ??
    listing.images?.[0]?.url
  );
}

export function ListingCard({ listing, imageHeightClass = "h-56" }: ListingCardProps) {
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const coverImage = resolveCoverImage(listing);
  const score = listing.seller?.trustScore ?? null;
  const tier = listing.seller?.trustTier ?? null;
  const verificationStatus = listing.seller?.verificationStatus ?? null;
  const isOwnListing = user?.id === listing.sellerId;

  return (
    <article
      className={
        isOwnListing
          ? "overflow-hidden rounded-2xl border-2 border-amber-400 bg-white shadow-sm ring-4 ring-amber-100 transition hover:-translate-y-0.5 hover:shadow-md"
          : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      }
    >
      <div className="relative">
        {isOwnListing && (
          <div className="absolute left-3 top-3 z-10 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-gray-950 shadow-sm">
            Your listing
          </div>
        )}

        <div className={`${imageHeightClass} w-full overflow-hidden bg-gradient-to-br from-amber-100 to-emerald-100`}>
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={listing.title}
              className="h-full w-full object-cover object-center"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-amber-700">{listing.category}</p>
          <VerificationBadge status={verificationStatus} compact />
        </div>

        <h3 className="mt-2 line-clamp-2 text-xl font-bold text-gray-950">
          {listing.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.description}</p>
        <p className="mt-4 text-lg font-black text-gray-950">GH₵ {String(listing.price)}</p>
        <p className="text-sm text-gray-600">{listing.locationRegion ?? "Ghana"}</p>

        <div className="mt-4 flex flex-col gap-2">
          <TrustScoreBadge score={score} tier={tier} />
          <Link
            href={`/sellers/${listing.sellerId}`}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            View seller storefront
          </Link>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Link
            href={`/listings/${listing.id}`}
            className="rounded-xl bg-black px-3 py-2 text-center text-xs font-bold text-white hover:bg-gray-800"
          >
            View details
          </Link>

          {isOwnListing ? (
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-bold text-amber-800 hover:bg-amber-100 sm:col-span-2"
            >
              Edit listing
            </Link>
          ) : (
            <>
              <ListingMessageButton
                listingId={listing.id}
                sellerId={listing.sellerId}
                listingTitle={listing.title}
              />
              <ListingSafeDealButton
                listingId={listing.id}
                sellerId={listing.sellerId}
              />
            </>
          )}
        </div>
      </div>
    </article>
  );
}
