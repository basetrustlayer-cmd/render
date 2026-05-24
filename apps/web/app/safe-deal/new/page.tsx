"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type SafeDealResponse = {
  safeDeal: {
    id: string;
    amount: string;
    feeAmount: string;
    status: string;
  };
  checkout: {
    provider: "TRUSTLAYER";
    authorizationUrl: string;
    escrowId: string;
  };
};

function SafeDealCheckout() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fundSafeDeal() {
    if (!listingId) {
      setError("Missing listing ID.");
      return;
    }

    if (!user?.id) {
      setError("Please log in before starting a Safe Deal.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<SafeDealResponse>("/safe-deals", {
        method: "POST",
        body: JSON.stringify({ listingId })
      });

      window.location.href = result.checkout.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Safe Deal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/listings" className="text-sm underline">
        ← Back to listings
      </Link>

      <section className="mt-6 rounded-2xl border bg-white p-8 shadow-sm">
        <p className="font-bold text-amber-700">Safe Deal</p>
        <h1 className="mt-2 text-4xl font-extrabold">Protected Transaction Checkout</h1>
        <p className="mt-4 max-w-2xl text-gray-600">
          Funds are held securely until the buyer confirms that the item was received and inspected.
        </p>

        <div className="mt-8 rounded-2xl border bg-gray-50 p-6">
          <h2 className="text-2xl font-bold">Buyer Protection</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
            <li>Funds held in escrow</li>
            <li>Inspection window before release</li>
            <li>Dispute mediation support</li>
            <li>Verified seller identity signals</li>
          </ul>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!user && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You must log in before funding a Safe Deal.
          </div>
        )}

        <button
          onClick={fundSafeDeal}
          disabled={loading || !listingId || !user}
          className="mt-8 w-full rounded-xl bg-black px-5 py-4 font-semibold text-white disabled:bg-gray-400"
        >
          {loading ? "Starting Safe Deal..." : "Fund Safe Deal"}
        </button>
      </section>
    </main>
  );
}


export default function NewSafeDealPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-8">Loading Safe Deal checkout...</main>}>
      <SafeDealCheckout />
    </Suspense>
  );
}
