import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-xl text-center">

        <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
          Page not found
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-tight text-gray-950">
          404
        </h1>
        <p className="mt-4 text-xl font-bold text-gray-700">
          This listing may have been sold or removed.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-gray-500">
          The page you're looking for doesn't exist. Try searching for what you need or browse all listings.
        </p>

        <form action="/listings" className="mt-8 flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <input
            name="q"
            placeholder="Search listings..."
            className="flex-1 px-5 py-4 text-sm text-gray-950 outline-none"
          />
          <button
            type="submit"
            className="bg-amber-500 px-5 py-4 text-sm font-bold text-gray-950 hover:bg-amber-400"
          >
            Search
          </button>
        </form>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/listings"
            className="rounded-xl bg-gray-950 px-6 py-3 text-sm font-bold text-white hover:bg-black"
          >
            Browse all listings
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Go to homepage
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Render.com.gh</p>
          <p className="mt-1 text-sm text-gray-600">
            Ghana's verified marketplace — buy and sell with Ghana Card-verified sellers and Safe Deal escrow protection.
          </p>
        </div>

      </div>
    </main>
  );
}
