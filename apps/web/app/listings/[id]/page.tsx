import Link from "next/link";
import { getListing } from "../../../lib/get-listing";
import { TrustScoreBadge } from "../../../components/trust-score-badge";

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

export default async function ListingDetailPage({ params }: PageProps) {
  const { listing, seller } = await getListing(params.id);
  const coverImage = listing.images.find((image) => image.isCover) ?? listing.images[0];
  const otherImages = listing.images.filter((image) => image.id !== coverImage?.id);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <Link href="/listings" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
          ← Back to listings
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage.url} alt={listing.title} className="h-96 w-full object-cover" />
            ) : (
              <div className="flex h-96 w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100 text-gray-600">
                No listing photos yet
              </div>
            )}

            {otherImages.length > 0 && (
              <div className="grid grid-cols-3 gap-3 p-5">
                {otherImages.slice(0, 6).map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={image.id} src={image.url} alt={listing.title} className="h-28 w-full rounded-2xl object-cover" />
                ))}
              </div>
            )}

            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">{listing.category}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-950">{listing.title}</h1>
              <p className="mt-2 text-gray-600">{listing.locationRegion ?? "Ghana"}</p>
              <p className="mt-5 text-3xl font-black text-gray-950">GH₵ {String(listing.price)}</p>
              <p className="mt-5 text-base leading-8 text-gray-700">{listing.description || "No description provided."}</p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Info label="Condition" value={listing.condition || "Not specified"} />
                <Info label="Trust Status" value={seller.verificationStatus} />
                <Info label="Safe Deal" value="Available" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/messages" className={buttonBlack}>Message seller</Link>
                <Link href={`/safe-deal/new?listingId=${listing.id}`} className={buttonAmber}>Start Safe Deal</Link>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Seller trust profile</p>
            <h2 className="mt-2 text-2xl font-black text-gray-950">{seller.displayName}</h2>

            <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">TrustScore</p>
              <strong className="mt-2 block text-5xl text-emerald-700">{seller.trustScore}/1000</strong>
              <div className="mt-3">
                <TrustScoreBadge score={seller.trustScore} tier={seller.trustTier} />
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <Metric label="Reviews" value={String(seller.reviewCount)} />
              <Metric label="Completed Deals" value={String(seller.completedDeals)} />
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <strong className="text-gray-950">{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-gray-100 pb-3">
      <span className="text-sm text-gray-600">{label}</span>
      <strong className="whitespace-nowrap text-right text-gray-950">{value || "0"}</strong>
    </div>
  );
}

const buttonBlack = "rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black";
const buttonAmber = "rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-amber-400";
