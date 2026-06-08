"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TrustScoreBadge } from "./trust-score-badge";
import { VerificationBadge } from "./verification-badge";
import { ListingMessageButton } from "./listing-message-button";
import { ListingSafeDealButton } from "./listing-safe-deal-button";
import { useAuthStore } from "../store/auth";
import type { Listing } from "../lib/get-listings";

function formatGhsCompact(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `GH₵ ${safe.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

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

const CATEGORY_ICONS: Record<string, { paths: string[]; color: string }> = {
  VEHICLES: {
    color: "#D1D5DB",
    paths: [
      "M8 17H5a2 2 0 01-2-2v-4l3-6h12l3 6v4a2 2 0 01-2 2h-3",
      "M8 17a2 2 0 104 0 2 2 0 00-4 0M14 17a2 2 0 104 0 2 2 0 00-4 0",
      "M3 11h18",
    ],
  },
  REAL_ESTATE: {
    color: "#D1D5DB",
    paths: [
      "M3 12l9-9 9 9",
      "M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9",
    ],
  },
  ELECTRONICS: {
    color: "#D1D5DB",
    paths: [
      "M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z",
      "M9 3v5h5",
      "M12 12v5M9.5 14.5h5",
    ],
  },
  JOBS: {
    color: "#D1D5DB",
    paths: [
      "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z",
      "M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
      "M12 12v3M10.5 13.5h3",
    ],
  },
  SERVICES: {
    color: "#D1D5DB",
    paths: [
      "M12 6V4M12 20v-2M6.34 7.34L4.93 5.93M19.07 18.07l-1.41-1.41M4 12H2M22 12h-2M6.34 16.66l-1.41 1.41M19.07 5.93l-1.41 1.41",
      "M12 16a4 4 0 100-8 4 4 0 000 8z",
    ],
  },
  FASHION: {
    color: "#D1D5DB",
    paths: [
      "M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z",
    ],
  },
};

function CategoryPlaceholder({ category, heightClass }: { category: string; heightClass: string }) {
  const icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.ELECTRONICS;
  return (
    <div className={`${heightClass} flex w-full flex-col items-center justify-center gap-3 bg-gray-100`}>
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        stroke={icon.color}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
        {category.replace("_", " ")}
      </span>
    </div>
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

        <Link href={`/listings/${listing.id}`} className="block">
          {coverImage ? (
            <div className={`${imageHeightClass} w-full overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt={listing.title}
                className="h-full w-full object-cover object-center transition duration-200 hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : (
            <CategoryPlaceholder category={listing.category} heightClass={imageHeightClass} />
          )}
        </Link>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-amber-700">{listing.category.replace("_", " ")}</p>
          <VerificationBadge status={verificationStatus} compact />
        </div>

        <Link href={`/listings/${listing.id}`}>
          <h3 className="mt-2 line-clamp-2 text-xl font-bold text-gray-950 transition-colors hover:text-emerald-800">
            {listing.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.description}</p>
        <p className="mt-4 text-lg font-black text-gray-950">{formatGhsCompact(listing.price)}</p>
        <p className="text-sm text-gray-600">{listing.locationRegion ?? "Ghana"}</p>

        <div className="mt-4 flex flex-col gap-2">
          <TrustScoreBadge score={score} tier={tier} verificationStatus={verificationStatus} />
          <Link
            href={`/sellers/${listing.sellerId}`}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            View seller storefront
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {/* Primary action — full width */}
          <Link
            href={`/listings/${listing.id}`}
            className="w-full rounded-xl bg-gray-950 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-black"
          >
            View details
          </Link>

          {/* Secondary actions */}
          {isOwnListing ? (
            <Link
              href={`/dashboard/listings/${listing.id}/edit`}
              className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-xs font-bold text-amber-800 transition hover:bg-amber-100"
            >
              Edit listing
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ListingMessageButton
                listingId={listing.id}
                sellerId={listing.sellerId}
                listingTitle={listing.title}
              />
              <ListingSafeDealButton
                listingId={listing.id}
                sellerId={listing.sellerId}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
