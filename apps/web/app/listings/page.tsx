import Link from "next/link";
import { TrustScoreBadge } from "../../components/trust-score-badge";
import { getListings, type ListingFilters } from "../../lib/get-listings";

export const dynamic = "force-dynamic";

const categories = [
  ["", "All categories"],
  ["VEHICLES", "Vehicles"],
  ["REAL_ESTATE", "Real Estate"],
  ["ELECTRONICS", "Electronics"],
  ["JOBS", "Jobs"],
  ["SERVICES", "Services"],
  ["FASHION", "Fashion"]
];

type ListingsPageProps = {
  searchParams?: ListingFilters;
};

export default async function ListingsPage({ searchParams = {} }: ListingsPageProps) {
  try {
    const filters: ListingFilters = {
      q: searchParams.q,
      category: searchParams.category,
      locationRegion: searchParams.locationRegion,
      sort: searchParams.sort,
      verifiedOnly: searchParams.verifiedOnly === true || String(searchParams.verifiedOnly) === "true"
    };

    const { listings } = await getListings(filters);

    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Ghana marketplace
            </p>
            <h1 className="text-4xl font-black text-gray-950">Browse Listings</h1>
          </div>

          <Link href="/dashboard/create-listing" className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">
            Create Listing
          </Link>
        </div>

        <form className="mb-8 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_160px_auto]">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search listings..."
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          />

          <select name="category" defaultValue={filters.category ?? ""} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
            {categories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input
            name="locationRegion"
            defaultValue={filters.locationRegion ?? ""}
            placeholder="Region"
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          />

          <select name="sort" defaultValue={filters.sort ?? "newest"} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>

          <button className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950">
            Filter
          </button>
        </form>

        {listings.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-gray-700 shadow-sm">
            No listings match this search.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {listings.map((listing) => {
              const coverImage = listing.images?.[0]?.url;
              const score = listing.seller?.trustScore ?? 500;
              const tier = listing.seller?.trustTier ?? "NEW";
              const verified = (listing.seller?.verificationLevel ?? 0) >= 1;

              return (
                <article key={listing.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage} alt={listing.title} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 bg-gradient-to-br from-amber-100 to-emerald-100" />
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-amber-700">{listing.category}</p>
                      {verified && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          Verified
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 text-xl font-bold text-gray-950">{listing.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{listing.description}</p>
                    <p className="mt-4 font-black text-gray-950">GH₵ {String(listing.price)}</p>
                    <p className="text-sm text-gray-600">{listing.locationRegion ?? "Ghana"}</p>

                    <div className="mt-4">
                      <TrustScoreBadge score={score} tier={tier} />
                    </div>

                    <Link href={`/listings/${listing.id}`} className="mt-4 block rounded-xl bg-black px-4 py-2 text-center text-sm font-bold text-white">
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
        <pre className="mt-6 overflow-auto rounded bg-gray-100 p-4 text-sm">
          {error instanceof Error ? error.message : "Unknown error"}
        </pre>
      </main>
    );
  }
}
