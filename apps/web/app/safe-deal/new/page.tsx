"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const conversationId = searchParams.get("conversationId");
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fundSafeDeal() {
    if (!listingId) {
      setError("Missing listing ID.");
      return;
    }

    if (!user?.id) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<SafeDealResponse>("/safe-deals", {
        method: "POST",
        body: JSON.stringify({ listingId, conversationId: conversationId ?? undefined })
      });

      window.location.href = result.checkout.authorizationUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start Safe Deal.";

      if (message.includes("Level 2 verification is required to start a Safe Deal")) {
        setError("Complete Level 2 verification before starting a Safe Deal. Listings can be browsed without verification, but protected transactions require verification.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <Link href="/listings" className="text-sm underline">
        ← Back to listings
      </Link>

      <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <p className="font-bold text-amber-700">Safe Deal</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Start a Safe Deal Request</h1>
        <p className="mt-4 max-w-2xl text-gray-600">
          Create a structured Safe Deal request for this listing. TrustLayer handles the protected transaction workflow.
        </p>

        <div className="mt-8 rounded-2xl border bg-gray-50 p-6">
          <h2 className="text-2xl font-bold">Safe Deal Workflow</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
            <li>TrustLayer-managed protected transaction workflow</li>
            <li>Buyer confirmation and inspection checkpoints</li>
            <li>Dispute support through the TrustLayer workflow</li>
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
            Log in before starting a Safe Deal. Protected transactions require Level 2 verification.
          </div>
        )}

        {error?.includes("Complete Level 2 verification") && (
          <Link
            href="/verify"
            className="mt-4 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-amber-400"
          >
            Get Verified
          </Link>
        )}

        <button
          onClick={fundSafeDeal}
          disabled={loading || !listingId}
          className="mt-8 w-full rounded-xl bg-black px-5 py-4 font-semibold text-white disabled:bg-gray-400"
        >
          {loading ? "Starting Safe Deal..." : "Start Safe Deal"}
        </button>
      </section>
    </main>
  );
}


export default function NewSafeDealPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-4 sm:p-8">Loading Safe Deal checkout...</main>}>
      <SafeDealCheckout />
    </Suspense>
  );
}
