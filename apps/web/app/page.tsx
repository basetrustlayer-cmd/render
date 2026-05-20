import Link from "next/link";
import { getListings } from "../lib/get-listings";

export const dynamic = "force-dynamic";

const categories = [
  { label: "Vehicles", href: "/listings?category=VEHICLES" },
  { label: "Real Estate", href: "/listings?category=REAL_ESTATE" },
  { label: "Electronics", href: "/listings?category=ELECTRONICS" },
  { label: "Jobs", href: "/listings?category=JOBS" },
  { label: "Services", href: "/listings?category=SERVICES" },
  { label: "Fashion", href: "/listings?category=FASHION" }
];

export default async function HomePage() {
  const { listings } = await getListings();
  const featuredListings = listings.slice(0, 6);

  return (
    <main className="min-h-screen p-8">
      <section className="mx-auto max-w-6xl rounded-[28px] border bg-white/50 p-8 md:p-12">
        <p className="font-bold text-yellow-700">Powered by TrustLayer</p>

        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
          Ghana&apos;s verified marketplace.
        </h1>

        <p className="mt-6 max-w-2xl text-xl leading-8">
          Buy and sell with confidence using verified seller identity,
          TrustScore reputation, messaging, reviews, and Safe Deal escrow.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/listings" className="rounded-full bg-black px-5 py-3 text-white">
            Browse Listings
          </Link>
          <Link href="/listings/new" className="rounded-full border bg-white px-5 py-3">
            Create Listing
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {categories.map((category) => (
            <Link key={category.label} href={category.href} className="rounded-full border bg-white px-4 py-2">
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Featured Listings</h2>
          <Link href="/listings" className="underline">
            View all
          </Link>
        </div>

        {featuredListings.length === 0 ? (
          <p>No listings yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {featuredListings.map((listing) => (
              <article key={listing.id} className="rounded border bg-white p-4">
                <p className="text-sm text-gray-600">{listing.category}</p>
                <h3 className="mt-2 text-xl font-semibold">{listing.title}</h3>
                <p className="mt-2">{listing.description}</p>
                <p className="mt-4 font-bold">GH₵ {String(listing.price)}</p>
                <p className="text-sm text-gray-600">{listing.locationRegion}</p>

                <Link
                  href={`/listings/${listing.id}`}
                  className="mt-4 block rounded bg-black px-4 py-2 text-center text-white"
                >
                  View Details
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
