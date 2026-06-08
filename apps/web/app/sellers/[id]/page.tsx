import Link from "next/link";
import { CopyStorefrontLink } from "../../../components/copy-storefront-link";
import { ListingCard } from "../../../components/listing-card";
import { SellerReviewSummary } from "../../../components/seller-review-summary";
import { TrustLayerFreshnessCard } from "../../../components/trustlayer-freshness-card";
import { TrustScoreBadge } from "../../../components/trust-score-badge";
import { VerificationBadge } from "../../../components/verification-badge";
import { getSeller, getSellerListings } from "../../../lib/get-seller";
import { getSellerReviews } from "../../../lib/get-seller-reviews";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function formatTrustSyncedAt(value?: string | null) {
  return value ? `Trust data last synced ${formatDate(value)}` : "Trust data sync pending";
}

export default async function SellerStorefrontPage({ params }: PageProps) {
  const [{ seller }, { listings }, { summary, reviews }] = await Promise.all([
    getSeller(params.id),
    getSellerListings(params.id),
    getSellerReviews(params.id)
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/listings" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
            ← Back to listings
          </Link>

          <CopyStorefrontLink
            sellerId={seller.id}
            sellerName={seller.displayName}
            trustScore={seller.trustScore}
            trustTier={seller.trustTier}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 sm:p-6 lg:p-8">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller storefront</p>

            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                  {seller.displayName}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <VerificationBadge status={seller.verificationStatus} />
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-emerald-700 shadow-sm">
                    {seller.trustBadge ?? "TrustLayer sync pending"}
                  </span>
                </div>

                <div className="mt-5">
                  <TrustScoreBadge score={seller.trustScore} tier={seller.trustTier} verificationStatus={seller.verificationStatus} />
                  <p className="mt-2 text-xs text-gray-500">{formatTrustSyncedAt(seller.trustLastSyncedAt)}</p>
                </div>

                <div className="mt-4">
                  <TrustLayerFreshnessCard lastSyncedAt={seller.trustLastSyncedAt} status={seller.verificationStatus} />
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-600">
                  Review this seller's active listings, Render buyer reviews, and TrustLayer-provided verification projections before starting a conversation or Safe Deal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="TrustScore" value={seller.trustScore === null ? "Pending" : `${seller.trustScore}/1000`} />
                <Metric label="Listings" value={String(seller.activeListings)} />
                <Metric label="Safe Deal Requests" value={String(seller.safeDealRequestCount)} />
                <Metric label="Render Reviews" value={summary.reviewCount === null ? "Pending" : String(summary.reviewCount)} />
                <Metric label="Render Rating" value={summary.averageRating === null ? "Pending" : summary.reviewCount === 0 ? "New" : summary.averageRating.toFixed(1)} />
                <Metric label="Since" value={formatDate(seller.memberSince)} />
              </div>
            </div>
          </div>
        </section>

        <SellerReviewSummary summary={summary} reviews={reviews} />

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Active listings</p>
              <h2 className="text-2xl font-black text-gray-950 sm:text-3xl">Active marketplace listings</h2>
            </div>
            <p className="text-sm text-gray-600">
              {listings.length} active listing{listings.length === 1 ? "" : "s"}
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
              This seller has no active listings.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-black text-gray-950">{value}</p>
    </div>
  );
}
