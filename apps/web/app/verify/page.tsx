"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

type GhanaCardVerifyResponse = {
  verification: {
    provider: string;
    status: "VERIFIED" | "REJECTED" | "PENDING";
    reference?: string;
    user?: {
      id: string;
      verificationLevel: number;
      trustScore: number | null;
      trustTier: string | null;
    };
  };
};

const levels = [
  {
    level: 1,
    name: "Phone verified",
    tag: "Level 1",
    done: true,
    unlocks: ["Message sellers", "Save listings", "WhatsApp contact"],
    color: "emerald",
  },
  {
    level: 2,
    name: "Ghana Card",
    tag: "Level 2",
    done: false,
    unlocks: ["Post listings", "Verified seller badge", "TrustScore", "Safe Deal as buyer"],
    color: "amber",
  },
  {
    level: 3,
    name: "Business verified",
    tag: "Level 3",
    done: false,
    unlocks: ["Business badge", "Unlimited listings", "Receive Safe Deal payouts"],
    color: "blue",
  },
];

const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/;

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (digits.length <= 3) return digits.startsWith("GHA") ? "GHA" : digits;
  if (digits.length <= 12) return `GHA-${digits.slice(3)}`;
  return `GHA-${digits.slice(3, 12)}-${digits.slice(12, 13)}`;
}

export default function VerifyPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GhanaCardVerifyResponse["verification"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() { logout(); router.replace("/login"); }
    window.addEventListener("render-auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("render-auth-invalid", handleInvalidAuth);
  }, [logout, router]);

  const currentLevel = user?.verificationLevel ?? 0;
  const isValid = GHANA_CARD_PATTERN.test(ghanaCardNumber);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiFetch<GhanaCardVerifyResponse>("/verify/ghana-card", {
        method: "POST",
        body: JSON.stringify({ ghanaCardNumber }),
      });
      setResult(response.verification);
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
        logout();
        router.replace("/login");
        return;
      }
      const msg = err instanceof Error ? err.message : "Unable to verify Ghana Card.";
      if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
        setError("Too many attempts. Wait a few minutes before trying again.");
      } else if (msg.includes("400") || msg.toLowerCase().includes("invalid")) {
        setError("That Ghana Card number doesn't match NIA records. Check the number on your card and try again.");
      } else {
        setError("Verification is temporarily unavailable. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">

        {/* Page header */}
        <p className="text-sm font-bold uppercase tracking-widest text-amber-600">
          TrustLayer verification
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
          Build trust before you trade.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
          Identity verification turns your profile into a credibility signal buyers can rely on.
          Each level unlocks more of the marketplace.
        </p>

        {/* Progress ladder */}
        <div className="mt-10 grid gap-3">
          {levels.map((step) => {
            const isDone = currentLevel >= step.level;
            const isCurrent = currentLevel === step.level - 1;

            return (
              <div
                key={step.level}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50"
                    : isCurrent
                    ? "border-amber-300 bg-white shadow-sm ring-2 ring-amber-100"
                    : "border-gray-200 bg-white opacity-60"
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Status icon */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                        ? "bg-amber-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isDone ? "✓" : step.level}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isDone ? "bg-emerald-100 text-emerald-800"
                          : isCurrent ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {step.tag}
                      </span>
                      <span className="text-base font-bold text-gray-950">{step.name}</span>
                      {isDone && (
                        <span className="text-xs font-semibold text-emerald-700">Complete</span>
                      )}
                    </div>

                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {step.unlocks.map((item) => (
                        <li key={item} className="flex items-center gap-1.5 text-sm text-gray-600">
                          <span className={isDone ? "text-emerald-500" : "text-gray-400"}>→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ghana Card form — only if Level 1 done, Level 2 not */}
        {currentLevel === 1 && (
          <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-amber-50 px-6 py-5">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
                Next step
              </p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">
                Verify your Ghana Card
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Your Ghana Card number is sent to TrustLayer's NIA integration. Render never stores your ID document.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Ghana Card number
              </label>
              <input
                required
                value={ghanaCardNumber}
                onChange={(e) => setGhanaCardNumber(formatCardNumber(e.target.value))}
                placeholder="GHA-000000000-0"
                maxLength={15}
                className={`w-full rounded-2xl border px-4 py-3 font-mono text-lg tracking-widest text-gray-950 outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 ${
                  ghanaCardNumber && !isValid
                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : "border-gray-200 bg-gray-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                }`}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Format: GHA-123456789-0 — found on the front of your Ghana Card.
              </p>

              {ghanaCardNumber && !isValid && (
                <p className="mt-2 text-xs text-red-600">
                  Check the format — should be GHA followed by 9 digits and 1 check digit.
                </p>
              )}

              {error && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {result && result.status === "VERIFIED" && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-bold text-emerald-800">✓ Verification successful</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    Your Ghana Card has been verified. You can now post listings and earn your verified seller badge.
                  </p>
                  <Link
                    href="/dashboard/create-listing"
                    className="mt-3 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Create your first listing →
                  </Link>
                </div>
              )}

              {result && result.status === "PENDING" && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <p className="font-bold">Verification in progress</p>
                  <p className="mt-1">TrustLayer is cross-referencing with NIA records. This usually completes within 2 minutes. We'll update your profile automatically.</p>
                </div>
              )}

              {result && result.status === "REJECTED" && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-bold">Verification not successful</p>
                  <p className="mt-1">The details don't match NIA records. Double-check your card number and try again, or contact support.</p>
                </div>
              )}

              {!result && (
                <button
                  type="submit"
                  disabled={submitting || !isValid}
                  className="mt-6 w-full rounded-2xl bg-gray-950 px-5 py-4 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  {submitting ? "Verifying with TrustLayer…" : "Verify Ghana Card"}
                </button>
              )}

              <p className="mt-4 text-center text-xs text-gray-400">
                Verification is powered by TrustLayer · NIA Ghana integration.
                Your document is never stored by Render.
              </p>
            </form>
          </div>
        )}

        {/* Not logged in */}
        {currentLevel === 0 && (
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="font-bold text-amber-900">Sign in first</p>
            <p className="mt-1 text-sm text-amber-800">You need to sign in with your Ghana mobile number before verifying.</p>
            <Link
              href="/login?next=/verify"
              className="mt-4 inline-block rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black"
            >
              Sign in to continue
            </Link>
          </div>
        )}

        {/* Already at Level 2+ */}
        {currentLevel >= 2 && (
          <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-2xl font-black text-emerald-800">✓ Identity verified</p>
            <p className="mt-2 text-sm text-emerald-700">
              Your Ghana Card verification is complete. You have full access to listings, Safe Deal, and your verified badge.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
