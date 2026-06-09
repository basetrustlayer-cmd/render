import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";
import { ListingCard } from "../../components/listing-card";
import { getListings, type ListingFilters } from "../../lib/get-listings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Marketplace Listings",
  description: "Browse verified marketplace listings in Ghana by category, region, search term, and price sort.",
  alternates: { canonical: "/listings" },
  openGraph: {
    title: "Browse Marketplace Listings | Render.com.gh",
    description: "Browse verified marketplace listings in Ghana by category, region, search term, and price sort.",
    url: "/listings"
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Marketplace Listings | Render.com.gh",
    description: "Browse verified marketplace listings in Ghana by category, region, search term, and price sort."
  }
};

const categories = [
  ["", "All categories"],
  ["VEHICLES", "Vehicles"],
  ["REAL_ESTATE", "Real Estate"],
  ["ELECTRONICS", "Electronics"],
  ["JOBS", "Jobs"],
  ["SERVICES", "Services"],
  ["FASHION", "Fashion"]
];

const HIGH_VALUE_CATEGORIES = new Set(["VEHICLES", "REAL_ESTATE"]);

const CATEGORY_LABELS: Record<string, string> = {
  VEHICLES: "Vehicles",
  REAL_ESTATE: "Real Estate",
  ELECTRONICS: "Electronics",
  JOBS: "Jobs",
  SERVICES: "Services",
  FASHION: "Fashion",
};

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

    const hasFilters = Boolean(
      filters.q ||
      filters.category ||
      filters.locationRegion ||
      filters.sort ||
      filters.verifiedOnly
    );

    const isHighValueCategory = HIGH_VALUE_CATEGORIES.has(filters.category ?? "");
    const categoryLabel = filters.category ? (CATEGORY_LABELS[filters.category] ?? filters.category) : null;

    const { listings } = await getListings(filters);

    const collectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Browse Marketplace Listings",
      url: "https://render.com.gh/listings",
      description: "Browse verified marketplace listings in Ghana by category, region, search term, and price sort.",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: listings.slice(0, 24).map((listing, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `https://render.com.gh/listings/${listing.id}`,
          name: listing.title
        }))
      }
    };

    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <JsonLd data={collectionJsonLd} />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Ghana marketplace
            </p>
            <h1 className="text-3xl font-black text-gray-950 sm:text-4xl">Browse Listings</h1>
          </div>
          <Link href="/dashboard/create-listing" className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">
            Create Listing
          </Link>
        </div>

        <form className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_160px_auto]">
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

        {/* UX-002 + UX-012: verified-only toggle, auto-prominent for high-value categories */}
        <div className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          isHighValueCategory
            ? "border-emerald-200 bg-emerald-50"
            : "border-gray-200 bg-white"
        }`}>
          <input
            type="checkbox"
            id="verifiedOnly"
            name="verifiedOnly"
            form="filter-form"
            defaultChecked={filters.verifiedOnly || isHighValueCategory}
            className="h-4 w-4 rounded accent-emerald-600"
          />
          <label htmlFor="verifiedOnly" className={`text-sm font-semibold ${isHighValueCategory ? "text-emerald-900" : "text-gray-700"}`}>
            Verified sellers only
            {isHighValueCategory && categoryLabel && (
              <span className="ml-2 text-xs font-normal text-emerald-700">
                — recommended for {categoryLabel.toLowerCase()}
              </span>
            )}
          </label>
          {!isHighValueCategory && (
            <span className="ml-auto text-xs text-gray-400">Ghana Card verified sellers</span>
          )}
        </div>

        {hasFilters && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
            <span>
              Showing {listings.length} result{listings.length === 1 ? "" : "s"} for current filters.
            </span>
            <Link href="/listings" className="font-bold text-emerald-700 hover:text-emerald-900">
              Clear filters
            </Link>
          </div>
        )}

        {listings.length === 0 ? (
          // UX-011: category-aware empty state
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
              No matching listings
            </p>
            <h2 className="mt-2 text-2xl font-black text-gray-950">
              {filters.q
                ? `No results for "${filters.q}"${categoryLabel ? ` in ${categoryLabel}` : ""}`
                : "No listings match your filters"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
              Try broadening your search, changing the category, or clearing your filters.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {categoryLabel && (
                <Link
                  href={`/listings?category=${filters.category}`}
                  className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black"
                >
                  Browse all {categoryLabel}
                </Link>
              )}
              <Link
                href="/listings"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                Clear all filters
              </Link>
              <Link
                href="/dashboard/create-listing"
                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50"
              >
                Create a listing
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    );
  } catch (error) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Listings temporarily unavailable</h1>
        <pre className="mt-6 overflow-auto rounded bg-gray-100 p-4 text-sm">
          {error instanceof Error ? error.message : "Unknown error"}
        </pre>
      </main>
    );
  }
}
