"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { ApiError, apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type ProfileResponse = {
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    whatsappNumber: string | null;
    verificationLevel: number;
    trustTier: string | null;
    isBusiness: boolean;
    isSuspended: boolean;
  };
};

const VERIFICATION_LABELS: Record<number, string> = {
  0: "0 — Browse only",
  1: "1 — Phone verified",
  2: "2 — Ghana Card verified",
  3: "3 — Business verified",
};

export default function ProfilePage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() { logout(); router.replace("/login"); }
    window.addEventListener("render-auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("render-auth-invalid", handleInvalidAuth);
  }, [logout, router]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<ProfileResponse>("/auth/me");
        setProfile(result.user);
        setWhatsapp(result.user.whatsappNumber ?? "");
        setEmail(result.user.email ?? "");
      } catch (err) {
        if (err instanceof ApiError && [401, 403].includes(err.status)) {
          logout(); router.replace("/login"); return;
        }
        setError(err instanceof Error ? err.message : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, [logout, router]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const result = await apiFetch<ProfileResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          email: email || undefined,
          whatsappNumber: whatsapp || undefined,
        }),
      });
      setProfile(result.user);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <p className="mt-1 text-sm text-gray-600">
              Your Render identity, verification, and contact details.
            </p>
          </div>
          {profile && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Edit
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            Loading profile…
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            ✓ Profile saved
          </div>
        )}

        {profile && !editing && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ProfileField label="Phone" value={profile.phone ?? "Not provided"} />
            <ProfileField
              label="WhatsApp number"
              value={profile.whatsappNumber ?? "Not set"}
              highlight={!profile.whatsappNumber}
              hint={!profile.whatsappNumber ? "Add your WhatsApp number so buyers can contact you directly." : undefined}
            />
            <ProfileField label="Email" value={profile.email ?? "Not set"} />
            <ProfileField
              label="Verification level"
              value={VERIFICATION_LABELS[profile.verificationLevel] ?? String(profile.verificationLevel)}
            />
            <ProfileField label="Trust tier" value={profile.trustTier ?? "Pending"} />
            <ProfileField label="Account type" value={profile.isBusiness ? "Business" : "Individual"} />
            <ProfileField label="Account status" value={profile.isSuspended ? "Suspended" : "Active"} />
            <ProfileField label="User ID" value={profile.id} mono />
          </div>
        )}

        {/* Edit form */}
        {profile && editing && (
          <div className="mt-6 grid gap-5">
            {/* Read-only fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileField label="Phone" value={profile.phone ?? "Not provided"} />
              <ProfileField
                label="Verification level"
                value={VERIFICATION_LABELS[profile.verificationLevel] ?? String(profile.verificationLevel)}
              />
            </div>

            {/* Editable fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  WhatsApp number
                </label>
                <input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="0241234567"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-950 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Buyers will see a WhatsApp button on your listings. Enter your Ghana number starting with 0.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-950 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used for Safe Deal receipts and marketplace notifications.
                </p>
              </div>
            </div>

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:bg-gray-300 disabled:text-gray-500 transition"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  setWhatsapp(profile.whatsappNumber ?? "");
                  setEmail(profile.email ?? "");
                }}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>

            {profile.verificationLevel < 2 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Get verified to unlock listing creation</p>
                <p className="mt-1 text-sm text-amber-800">
                  Ghana Card verification takes about 2 minutes and unlocks posting listings, your verified badge, and your TrustScore.
                </p>
                <Link
                  href="/verify"
                  className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-gray-950 hover:bg-amber-400 transition"
                >
                  Get verified →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ProfileField({
  label, value, highlight, hint, mono
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 break-all text-base font-semibold ${mono ? "font-mono text-sm" : ""} ${highlight ? "text-amber-800" : "text-gray-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-amber-700">{hint}</p>}
    </div>
  );
}
