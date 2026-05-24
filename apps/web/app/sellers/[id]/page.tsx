import Link from "next/link";
import { ListingCard } from "../../../components/listing-card";
import { TrustScoreBadge } from "../../../components/trust-score-badge";
import { getSeller, getSellerListings } from "../../../lib/get-seller";

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

export default async function SellerStorefrontPage({ params }: PageProps) {
  const [{ seller }, { listings }] = await Promise.all([
    getSeller(params.id),
    getSellerListings(params.id)
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <Link href="/listings" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
          ← Back to listings
        </Link>

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller storefront</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <h1 className="text-4xl font-black text-gray-950">{seller.displayName}</h1>
              <p className="mt-2 text-gray-600">{seller.verificationStatus}</p>
              <div className="mt-4">
                <TrustScoreBadge score={seller.trustScore} tier={seller.trustTier} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric label="TrustScore" value={`${seller.trustScore}/1000`} />
              <Metric label="Listings" value={String(seller.activeListings)} />
              <Metric label="Deals" value={String(seller.completedDeals)} />
              <Metric label="Since" value={formatDate(seller.memberSince)} />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Active listings</p>
              <h2 className="text-3xl font-black text-gray-950">More from this seller</h2>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
              This seller has no active listings.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
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
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-black text-gray-950">{value}</p>
    </div>
  );
}
