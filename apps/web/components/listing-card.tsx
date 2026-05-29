import Link from "next/link";
import { TrustScoreBadge } from "./trust-score-badge";
import { ListingMessageButton } from "./listing-message-button";
import type { Listing } from "../lib/get-listings";

type ListingCardProps = {
  listing: Listing;
  imageHeightClass?: string;
};

export function ListingCard({ listing, imageHeightClass = "h-44" }: ListingCardProps) {
  const coverImage = listing.images?.[0]?.url;
  const score = listing.seller?.trustScore ?? null;
  const tier = listing.seller?.trustTier ?? null;
  const verified = (listing.seller?.verificationLevel ?? 0) >= 1;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt={listing.title} className={`${imageHeightClass} w-full object-cover`} />
      ) : (
        <div className={`${imageHeightClass} bg-gradient-to-br from-amber-100 to-emerald-100`} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-amber-700">{listing.category}</p>
          {verified && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
              Verified
            </span>
          )}
        </div>

        <h3 className="mt-2 text-xl font-bold text-gray-950">{listing.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.description}</p>
        <p className="mt-4 text-lg font-black text-gray-950">GH₵ {String(listing.price)}</p>
        <p className="text-sm text-gray-600">{listing.locationRegion ?? "Ghana"}</p>

        <div className="mt-4">
          <TrustScoreBadge score={score} tier={tier} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={`/listings/${listing.id}`}
            className="rounded-xl bg-black px-3 py-2 text-center text-xs font-bold text-white hover:bg-gray-800"
          >
            View details
          </Link>

          <ListingMessageButton
            listingId={listing.id}
            sellerId={listing.sellerId}
            listingTitle={listing.title}
          />
        </div>
      </div>
    </article>
  );
}
