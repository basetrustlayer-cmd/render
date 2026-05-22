import Link from "next/link";
import { getListing } from "../../../lib/get-listing";

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
    <main className="mx-auto max-w-6xl p-6">
      <Link href="/listings" className="text-sm underline">
        ← Back to listings
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          {coverImage ? (
            <img
              src={coverImage.url}
              alt={listing.title}
              className="h-80 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-80 w-full items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
              No listing photos yet
            </div>
          )}

          {otherImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {otherImages.slice(0, 6).map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={listing.title}
                  className="h-28 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          <div className="mt-8">
            <p className="text-sm font-medium text-gray-500">{listing.category}</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-gray-600">{listing.locationRegion}</p>
            <h2 className="mt-5 text-3xl font-bold text-gray-900">
              GH₵ {String(listing.price)}
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-700">
              {listing.description || "No description provided."}
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Info label="Condition" value={listing.condition || "Not specified"} />
            <Info label="Trust Status" value={seller.verificationStatus} />
            <Info label="Safe Deal" value="Escrow Protection Available" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/messages" className={buttonBlack}>
              Message Seller
            </Link>
            <Link href={`/safe-deal/new?listingId=${listing.id}`} className={buttonWhite}>
              Start Safe Deal
            </Link>
          </div>
        </section>

        <aside className="rounded-3xl border bg-white p-6 shadow-sm">
          <p className="font-bold text-amber-700">Verified Seller</p>
          <h2 className="mt-2 text-3xl font-bold">{seller.displayName}</h2>

          <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
            <p className="text-gray-600">TrustScore</p>
            <strong className="text-5xl text-emerald-700">{seller.trustScore}/1000</strong>
            <p>{seller.trustTier}</p>
          </div>

          <div className="mt-6 grid gap-4">
            <Metric label="Reviews" value={`${seller.reviewCount} ★★★★★`} />
            <Metric label="Completed Deals" value={String(seller.completedDeals)} />
            <Metric label="Active Listings" value={String(seller.activeListings)} />
            <Metric label="Member Since" value={formatDate(seller.memberSince)} />
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <strong>Buy with Confidence</strong>
            <p className="mt-2 text-gray-700">
              This seller has completed identity verification and has an active Render marketplace profile.
            </p>
            <p className="mt-3 text-gray-700">
              Contact details are protected. Use Safe Deal or platform messaging to continue.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b pb-3">
      <span className="text-gray-600">{label}</span>
      <strong className="whitespace-nowrap text-right text-gray-900">{value || "0"}</strong>
    </div>
  );
}

const buttonBlack = "rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-black";

const buttonWhite =
  "rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50";
