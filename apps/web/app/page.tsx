import Link from "next/link";
import { JsonLd } from "../components/json-ld";
import { ListingCard } from "../components/listing-card";
import { getListings } from "../lib/get-listings";

export const dynamic = "force-dynamic";

const categories = [
  ["VEHICLES", "Vehicles"],
  ["REAL_ESTATE", "Real Estate"],
  ["ELECTRONICS", "Electronics"],
  ["JOBS", "Jobs"],
  ["SERVICES", "Services"],
  ["FASHION", "Fashion"]
];

export default async function HomePage() {
  const { listings } = await getListings();
  const featured = listings.slice(0, 6);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Render.com.gh",
    url: "https://render.com.gh",
    description: "Ghana marketplace for verified listings, buyer-seller messaging, and TrustLayer-powered trust projections.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://render.com.gh/listings?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <JsonLd data={websiteJsonLd} />

      <section className="bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
            Ghana classifieds marketplace
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
            Buy and sell with trust, speed, and local confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-200">
            Discover verified sellers, safer listings, and marketplace tools built for Ghana.
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

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
              Featured listings
            </p>
            <h2 className="mt-1 text-3xl font-black text-gray-950">Fresh marketplace picks</h2>
          </div>
          <Link href="/listings" className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">
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
