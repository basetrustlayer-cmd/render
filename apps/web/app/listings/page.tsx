import Link from "next/link";
import { ListingCard } from "../../components/listing-card";
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
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
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
