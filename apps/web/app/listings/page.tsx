import Link from "next/link";
import { TrustScoreBadge } from "../../components/trust-score-badge";
import { getListings } from "../../lib/get-listings";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  try {
    const { listings } = await getListings();

    return (
      <main className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Verified marketplace
            </p>
            <h1 className="text-4xl font-bold">Listings</h1>
          </div>

          <Link href="/dashboard/create-listing" className="rounded bg-black px-4 py-2 text-white">
            Create Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-gray-700 shadow-sm">
            No live listings yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {listings.map((listing) => {
              const coverImage = listing.images?.[0]?.url;
              const score = listing.seller?.trustScore ?? 500;
              const tier = listing.seller?.trustTier ?? "NEW";
              const verified = (listing.seller?.verificationLevel ?? 0) >= 1;

              return (
                <article key={listing.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImage}
                      alt={listing.title}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 bg-gradient-to-br from-amber-100 to-emerald-100" />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-amber-700">{listing.category}</p>
                      {verified && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          Verified
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.description}</p>
                    <p className="mt-4 font-bold">GH₵ {String(listing.price)}</p>
                    <p className="text-sm text-gray-600">{listing.locationRegion}</p>

                    <div className="mt-4">
                      <TrustScoreBadge score={score} tier={tier} />
                    </div>

                    <Link
                      href={`/listings/${listing.id}`}
                      className="mt-4 block rounded bg-black px-4 py-2 text-center text-white"
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    );
  } catch (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-4xl font-bold">Listings temporarily unavailable</h1>
        <p className="mt-4 text-gray-700">
          The marketplace API could not be reached from the frontend server.
        </p>
        <pre className="mt-6 overflow-auto rounded bg-gray-100 p-4 text-sm">
          {error instanceof Error ? error.message : "Unknown error"}
        </pre>
      </main>
    );
  }
}
