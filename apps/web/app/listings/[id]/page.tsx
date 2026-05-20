import Link from "next/link";
import { getListing } from "../../../lib/get-listing";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function ListingDetailPage({ params }: PageProps) {
  const { listing } = await getListing(params.id);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/listings" className="text-sm underline">
        ← Back to listings
      </Link>

      <section className="mt-8 rounded border p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-gray-600">{listing.category}</p>
            <h1 className="mt-2 text-4xl font-bold">{listing.title}</h1>
            <p className="mt-2 text-gray-600">{listing.locationRegion}</p>
          </div>

          <div className="rounded bg-black px-5 py-3 text-xl font-bold text-white">
            GH₵ {String(listing.price)}
          </div>
        </div>

        <p className="text-lg leading-8">{listing.description || "No description provided."}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded border p-4">
            <p className="text-sm text-gray-500">Condition</p>
            <p className="font-semibold">{listing.condition || "Not specified"}</p>
          </div>

          <div className="rounded border p-4">
            <p className="text-sm text-gray-500">Trust Status</p>
            <p className="font-semibold">Seller verification pending</p>
          </div>

          <div className="rounded border p-4">
            <p className="text-sm text-gray-500">Safe Deal</p>
            <p className="font-semibold">Available soon</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/messages" className="rounded bg-black px-5 py-3 text-center text-white">
            Message Seller
          </Link>

          <button className="rounded border px-5 py-3">
            Start Safe Deal
          </button>
        </div>
      </section>
    </main>
  );
}
