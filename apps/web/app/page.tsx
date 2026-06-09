import Link from "next/link";
import { JsonLd } from "../components/json-ld";
import { ListingCard } from "../components/listing-card";
import { getListings } from "../lib/get-listings";

export const dynamic = "force-dynamic";

const categories = [
  ["VEHICLES",    "Vehicles"],
  ["REAL_ESTATE", "Real Estate"],
  ["ELECTRONICS", "Electronics"],
  ["JOBS",        "Jobs"],
  ["SERVICES",    "Services"],
  ["FASHION",     "Fashion"],
];

function formatGhsCompact(value: number): string {
  if (value >= 1_000_000) return `GH₵ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `GH₵ ${(value / 1_000).toFixed(0)}K`;
  return `GH₵ ${value.toLocaleString("en-GH")}`;
}

export default async function HomePage() {
  const { listings } = await getListings();
  const featured = listings.slice(0, 6);

  // PL-005: social proof — derive from live listings already fetched
  const verifiedSellerIds = new Set(
    listings
      .filter((l) => (l.seller?.verificationLevel ?? 0) >= 2)
      .map((l) => l.sellerId)
  );
  const verifiedSellerCount = verifiedSellerIds.size;
  const showSocialProof = verifiedSellerCount > 0;

  // PL-009: category listing counts — group from same data, zero cost
  const categoryCounts = listings.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Render.com.gh",
    url: "https://render.com.gh",
    description: "Ghana's verified marketplace — buy and sell with identity-backed trust, Safe Deal escrow, and Ghana Card-verified sellers.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://render.com.gh/listings?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <JsonLd data={websiteJsonLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          {/* PL-002: trust-led positioning — not "classifieds" */}
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
            Ghana's verified marketplace
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Buy and sell with trust, speed, and local confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-200">
            Every seller is Ghana Card verified. Every transaction is protected by Safe Deal escrow. No guesswork, no scams.
          </p>

          <form action="/listings" className="mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-xl md:grid-cols-[1fr_auto]">
            <input
              name="q"
              placeholder="Search cars, phones, apartments, services..."
              className="rounded-xl border border-gray-200 px-4 py-3 text-gray-950 outline-none focus:border-amber-500"
            />
            <button className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-gray-950 hover:bg-amber-400">
              Search listings
            </button>
          </form>

          {/* PL-005: social proof — shown only when there is real data */}
          {showSocialProof && (
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Verified sellers</p>
                <p className="text-xl font-black text-white">{verifiedSellerCount.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-300">Active listings</p>
                <p className="text-xl font-black text-white">{listings.length.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map(([value, label]) => (
              <Link
                key={value}
                href={`/listings?category=${encodeURIComponent(value)}`}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Browse by category</p>
          <h2 className="mt-1 text-2xl font-black text-gray-950">What are you looking for?</h2>
        </div>

        {/* PL-009: category tiles with live listing counts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map(([value, label]) => {
            const count = categoryCounts[value] ?? 0;
            return (
              <Link
                key={value}
                href={`/listings?category=${encodeURIComponent(value)}`}
                className="group flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
              >
                <p className="text-sm font-bold text-gray-950 group-hover:text-amber-700">{label}</p>
                {count > 0 ? (
                  <p className="mt-1 text-xs font-semibold text-gray-400">{count} listing{count === 1 ? "" : "s"}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-300">Coming soon</p>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured listings */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Featured listings</p>
            <h2 className="mt-1 text-3xl font-black text-gray-950">Fresh marketplace picks</h2>
          </div>
          <Link href="/listings" className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800">
            View all
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
            No live listings yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} imageHeightClass="h-48" />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
