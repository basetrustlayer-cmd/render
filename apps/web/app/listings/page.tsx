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
            <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded border p-4 hover:bg-gray-50">
              <h2 className="text-xl font-semibold">{listing.title}</h2>
              <p className="mt-2">{listing.description}</p>
              <p className="mt-4 font-bold">GH₵ {String(listing.price)}</p>
              <p className="text-sm text-gray-600">{listing.category}</p>
              <p className="text-sm text-gray-600">{listing.locationRegion}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
