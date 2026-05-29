"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { ApiError, apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type ProfileResponse = {
  user: {
    id: string;
    phone: string | null;
    verificationLevel: number;
    trustTier: string | null;
    isBusiness: boolean;
    isSuspended: boolean;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<ProfileResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() {
      logout();
      router.replace("/login");
    }

    window.addEventListener("render-auth-invalid", handleInvalidAuth);

    return () => {
      window.removeEventListener("render-auth-invalid", handleInvalidAuth);
    };
  }, [logout, router]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFetch<ProfileResponse>("/auth/me");
        setProfile(result.user);
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

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
        <p className="mt-2 text-gray-600">
          Your Render identity, verification, and account status.
        </p>

        {loading && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Loading profile...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {profile && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ProfileField label="Phone" value={profile.phone ?? "Not provided"} />
            <ProfileField label="Verification Level" value={String(profile.verificationLevel)} />
            <ProfileField label="Trust Tier" value={profile.trustTier ?? "Pending"} />
            <ProfileField label="Account Type" value={profile.isBusiness ? "Business" : "Individual"} />
            <ProfileField label="Account Status" value={profile.isSuspended ? "Suspended" : "Active"} />
            <ProfileField label="User ID" value={profile.id} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 break-words text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
