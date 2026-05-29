import Link from "next/link";
import { getListing } from "../../../lib/get-listing";
import { TrustScoreBadge } from "../../../components/trust-score-badge";
import { VerificationBadge } from "../../../components/verification-badge";
import { TrustLayerFreshnessCard } from "../../../components/trustlayer-freshness-card";
import { ListingDetailActions } from "./listing-detail-actions";
import { ListingImageGallery } from "./listing-image-gallery";

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

export default async function ListingDetailPage({ params }: PageProps) {
  const { listing, seller } = await getListing(params.id);
  const coverImage = listing.images.find((image) => image.isCover) ?? listing.images[0];
  const otherImages = listing.images.filter((image) => image.id !== coverImage?.id);
  const galleryImages = coverImage ? [coverImage, ...otherImages] : [];

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <Link href="/listings" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
          ← Back to listings
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <ListingImageGallery title={listing.title} images={galleryImages} />

            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">{listing.category}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-950">{listing.title}</h1>
              <p className="mt-2 text-gray-600">{listing.locationRegion ?? "Ghana"}</p>
              <p className="mt-5 text-3xl font-black text-gray-950">GH₵ {String(listing.price)}</p>
              <p className="mt-5 text-base leading-8 text-gray-700">{listing.description || "No description provided."}</p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Info label="Condition" value={listing.condition || "Not specified"} />
                <Info label="Trust Status" value={<VerificationBadge status={seller.verificationStatus} />} />
                <Info label="Trust Badge" value={seller.trustBadge ?? "Not synced"} />
                <Info label="Safe Deal" value="Available" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ListingDetailActions
                  listingId={listing.id}
                  sellerId={seller.id}
                  listingTitle={listing.title}
                />
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller trust profile</p>
            <Link
              href={`/sellers/${seller.id}`}
              className="mt-2 block text-2xl font-black text-gray-950 hover:text-emerald-800"
            >
              {seller.displayName}
            </Link>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">TrustScore</p>
              <strong className="mt-2 block text-5xl text-emerald-700">{seller.trustScore === null ? "Pending" : `${seller.trustScore}/1000`}</strong>
              <p className="mt-2 text-sm text-emerald-800">{seller.trustBadge ?? seller.verificationStatus}</p>
              <div className="mt-3">
                <TrustScoreBadge score={seller.trustScore} tier={seller.trustTier} />
                <p className="mt-2 text-xs text-gray-500">{formatTrustSyncedAt(seller.trustLastSyncedAt)}</p>
              </div>
              <div className="mt-4">
                <TrustLayerFreshnessCard lastSyncedAt={seller.trustLastSyncedAt} status={seller.verificationStatus} />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <Metric label="Reviews" value={`${seller.reviewCount} · View seller reviews`} href={`/sellers/${seller.id}`} />
              <Metric label="Safe Deal Requests" value={String(seller.safeDealRequestCount)} />
              <Metric label="Active Listings" value={String(seller.activeListings)} />
              <Metric label="Member Since" value={formatDate(seller.memberSince)} />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <strong className="text-gray-950">Buy with confidence</strong>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Use Render messaging or Safe Deal before payment. Safe Deal keeps the transaction structured and auditable.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <strong className="text-gray-950">{value}</strong>
    </div>
  );
}

function Metric({ label, value, href }: { label: string; value: string; href?: string }) {
  const displayValue = value || "0";

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-gray-100 pb-3">
      <span className="text-sm text-gray-600">{label}</span>
      {href ? (
        <Link href={href} className="whitespace-nowrap text-right text-sm font-bold text-emerald-700 hover:text-emerald-900">
          {displayValue}
        </Link>
      ) : (
        <strong className="whitespace-nowrap text-right text-gray-950">{displayValue}</strong>
      )}
    </div>
  );
}
