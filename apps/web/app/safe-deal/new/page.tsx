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

function translateError(message: string): { heading: string; body: string; showVerify: boolean } {
  if (message.includes("Level 2 verification") || message.includes("verification is required")) {
    return {
      heading: "Verification required",
      body: "You need Ghana Card verification before starting a Safe Deal. It takes about 2 minutes.",
      showVerify: true,
    };
  }
  if (message.includes("200") || message.includes("minimum")) {
    return {
      heading: "Listing price too low",
      body: "Safe Deal is available for listings priced GH₵ 200 and above.",
      showVerify: false,
    };
  }
  if (message.includes("own listing") || message.includes("self")) {
    return {
      heading: "This is your listing",
      body: "You cannot start a Safe Deal on your own listing.",
      showVerify: false,
    };
  }
  return {
    heading: "Something went wrong",
    body: "Unable to start the Safe Deal. Please try again or contact support.",
    showVerify: false,
  };
}

const steps = [
  {
    n: "1",
    heading: "Your money is held — not sent",
    body: "When you fund a Safe Deal, your payment goes into escrow. The seller receives nothing until you confirm delivery.",
    icon: "🔒",
  },
  {
    n: "2",
    heading: "Inspect before you release",
    body: "After the seller marks delivery, you have 48 hours to inspect. Only you can release funds by tapping Confirm.",
    icon: "✅",
  },
  {
    n: "3",
    heading: "Dispute protection if something's wrong",
    body: "If the item isn't as described, open a dispute before confirming. Funds stay locked until the issue is resolved.",
    icon: "🛡️",
  },
];

function SafeDealCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");
  const conversationId = searchParams.get("conversationId");
  const listingPrice = searchParams.get("price");
  const listingTitle = searchParams.get("title");
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fundSafeDeal() {
    if (!listingId) { setError("Missing listing ID."); return; }
    if (!user?.id) { router.push("/login"); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<SafeDealResponse>("/safe-deals", {
        method: "POST",
        body: JSON.stringify({ listingId, conversationId: conversationId ?? undefined })
      });
      window.location.href = result.checkout.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Safe Deal.");
    } finally {
      setLoading(false);
    }
  }

  const parsedError = error ? translateError(error) : null;

  const priceDisplay = listingPrice
    ? `GH₵ ${Number(listingPrice).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">

        <Link href="/listings" className="text-sm font-semibold text-gray-600 hover:text-gray-950">
          ← Back to listings
        </Link>

        {/* Header */}
        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-600">Safe Deal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            {listingTitle ? `Buy: ${listingTitle}` : "Start a Safe Deal"}
          </h1>
          {priceDisplay && (
            <p className="mt-1 text-xl font-black text-gray-950">{priceDisplay}</p>
          )}
        </div>

        {/* Trust explainer */}
        <div className="mt-8 grid gap-3">
          {steps.map((step) => (
            <div key={step.n} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg">
                {step.icon}
              </div>
              <div>
                <p className="font-bold text-gray-950">{step.heading}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Not logged in */}
        {!user && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">Sign in to continue</p>
            <p className="mt-1 text-sm text-amber-800">
              You need to be signed in with a verified account to start a Safe Deal.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-black"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* Error */}
        {parsedError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-800">{parsedError.heading}</p>
            <p className="mt-1 text-sm text-red-700">{parsedError.body}</p>
            {parsedError.showVerify && (
              <Link
                href="/verify"
                className="mt-3 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-gray-950 hover:bg-amber-400"
              >
                Get verified now →
              </Link>
            )}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={fundSafeDeal}
          disabled={loading || !listingId || !user}
          className="mt-8 w-full rounded-2xl bg-emerald-700 px-5 py-4 text-base font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {loading
            ? "Starting Safe Deal…"
            : priceDisplay
            ? `Hold ${priceDisplay} in escrow — release only when satisfied`
            : "Start Safe Deal"}
        </button>

        <p className="mt-3 text-center text-xs text-gray-500">
          Powered by TrustLayer · Your funds are not sent to the seller until you confirm delivery.
        </p>
      </div>
    </main>
  );
}

export default function NewSafeDealPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center text-gray-400">
        Loading Safe Deal…
      </main>
    }>
      <SafeDealCheckout />
    </Suspense>
  );
}
