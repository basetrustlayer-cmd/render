import Link from "next/link";
import { getListings } from "../lib/get-listings";

export async function ListingGrid() {
  const { listings } = await getListings();

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <p className="text-sm text-gray-600">No live listings yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {listings.slice(0, 6).map((listing) => (
        <article key={listing.id} className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-gray-500">{listing.category}</p>
          <h3 className="mt-2 text-xl font-semibold">{listing.title}</h3>
          {listing.description ? (
            <p className="mt-2 line-clamp-2 text-gray-700">{listing.description}</p>
          ) : null}
          <p className="mt-4 font-bold">GH₵ {String(listing.price)}</p>
          {listing.locationRegion ? (
            <p className="text-sm text-gray-600">{listing.locationRegion}</p>
          ) : null}
          <Link
            href={`/listings/${listing.id}`}
            className="mt-4 block rounded bg-black px-4 py-2 text-center text-white"
          >
            View Details
          </Link>
        </article>
      ))}
    </div>
  );
}
