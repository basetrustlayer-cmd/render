"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

type ProfileResponse = {
  profile?: {
    id: string;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    isBusiness: boolean;
  };
  user?: {
    id: string;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    isBusiness: boolean;
  };
};

export default function CompleteProfilePage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await apiFetch<ProfileResponse>("/auth/me");

        const profile = result.profile ?? result.user;

        if (profile?.email) {
          router.replace("/dashboard");
          return;
        }

        setEmail(profile?.email ?? "");
        setWhatsappNumber(profile?.whatsappNumber ?? "");
        setIsBusiness(profile?.isBusiness ?? false);
      } catch (err) {
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          logout();
          router.replace("/login");
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [logout, router]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          email,
          emailMarketingOptIn: marketingOptIn,
          whatsappNumber: whatsappNumber || undefined,
          isBusiness
        })
      });

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <p className="text-sm font-bold uppercase tracking-wide text-amber-600">
        Complete Profile
      </p>
      <h1 className="mt-2 text-3xl font-black text-gray-950">
        Add your email
      </h1>
      <p className="mt-3 text-gray-600">
        Render uses phone-first login, but email is required for receipts, account notices,
        seller updates, and buyer protection communications.
      </p>

      {loading && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          Loading profile...
        </div>
      )}

      {!loading && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              className="w-full rounded border p-3"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              WhatsApp number optional
            </label>
            <input
              className="w-full rounded border p-3"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="0241234567"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={isBusiness}
              onChange={(event) => setIsBusiness(event.target.checked)}
            />
            <span>
              I am using Render for business buying, selling, or marketplace operations.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={marketingOptIn}
              onChange={(event) => setMarketingOptIn(event.target.checked)}
            />
            <span>
              Send me useful marketplace updates, seller education, buyer tips, and offers.
            </span>
          </label>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !email}
            className="w-full rounded bg-black p-3 text-white disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      )}
    </main>
  );
}
