import Link from "next/link";
import { getListing } from "../../../lib/get-listing";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ListingDetailPage({ params }: PageProps) {
  const { listing } = await getListing(params.id);

  const seller = {
    name: "Verified Render Seller",
    trustScore: 92,
    reviewCount: 18,
    completedDeals: 12,
    responseRate: 98,
    memberSince: "May 2026",
    verificationStatus: "Identity Verified"
  };

  return (
    <main className="mx-auto max-w-6xl p-8">
      <Link href="/listings" className="text-sm underline">
        ← Back to listings
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded border bg-white p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-gray-600">{listing.category}</p>
              <h1 className="mt-2 text-4xl font-bold">{listing.title}</h1>
              <p className="mt-2 text-gray-600">{listing.locationRegion}</p>
            </div>

            <div className="rounded bg-black px-5 py-3 text-xl font-bold text-white">
              GH₵ {String(listing.price)}
            </div>
          </div>

          <p className="text-lg leading-8">
            {listing.description || "No description provided."}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded border p-4">
              <p className="text-sm text-gray-500">Condition</p>
              <p className="font-semibold">
                {listing.condition || "Not specified"}
              </p>
            </div>

            <div className="rounded border p-4">
              <p className="text-sm text-gray-500">Trust Status</p>
              <p className="font-semibold text-green-700">
                {seller.verificationStatus}
              </p>
            </div>

            <div className="rounded border p-4">
              <p className="text-sm text-gray-500">Safe Deal</p>
              <p className="font-semibold text-green-700">
                Escrow Protection Available Soon
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/messages"
              className="rounded bg-black px-5 py-3 text-center text-white"
            >
              Message Seller
            </Link>

            <button className="rounded border px-5 py-3">
              Start Safe Deal
            </button>
          </div>
        </section>

        <aside className="rounded border bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-700">
            Verified Seller
          </p>

          <h2 className="mt-2 text-2xl font-bold">{seller.name}</h2>

          <div className="mt-6 rounded bg-green-50 p-4">
            <p className="text-sm text-gray-600">TrustScore</p>
            <p className="text-4xl font-bold text-green-700">
              {seller.trustScore}/100
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Reviews</span>
              <span className="font-semibold">
                {seller.reviewCount} ★★★★★
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Completed Deals</span>
              <span className="font-semibold">
                {seller.completedDeals}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Response Rate</span>
              <span className="font-semibold">
                {seller.responseRate}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold">
                {seller.memberSince}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              Buy with Confidence
            </p>
            <p className="mt-1 text-sm text-green-700">
              This seller has completed identity verification and maintains a
              strong trust record.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
