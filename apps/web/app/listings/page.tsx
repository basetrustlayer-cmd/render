import Link from "next/link";
import { getListings } from "../../lib/get-listings";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const { listings } = await getListings();

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Listings</h1>
        <Link href="/listings/new" className="rounded bg-black px-4 py-2 text-white">
          Create Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <p>No listings yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {listings.map((listing) => (
            <article key={listing.id} className="rounded border bg-white p-4">
              <p className="text-sm text-gray-600">{listing.category}</p>
              <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
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
    </main>
  );
}
