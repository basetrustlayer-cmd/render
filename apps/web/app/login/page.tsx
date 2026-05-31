"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestOtp } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  async function handleRequestOtp() {
    setLoading(true);
    setError(null);

    try {
      await requestOtp(phone);
      setOtpRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);

    try {
      await login(phone, code);

      const result = await apiFetch<{ profile: { email: string | null } }>("/auth/me");

      router.push(result.profile.email ? "/dashboard" : "/complete-profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Login</h1>

      <label className="mb-2 block text-sm font-medium text-gray-700">
        Mobile number
      </label>
      <div className="mb-4 flex">
        <div className="rounded-l border border-r-0 bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700">
          🇬🇭 +233
        </div>
        <input
          className="w-full rounded-r border p-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          maxLength={10}
          placeholder="0241234567"
        />
      </div>
      <p className="-mt-2 mb-4 text-xs text-gray-500">
        Enter your Ghana mobile number starting with 0.
      </p>

      {otpRequested && (
        <>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            OTP code
          </label>
          <input
            className="mb-4 w-full rounded border p-3"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="Enter SMS code"
          />
        </>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={otpRequested ? handleVerifyOtp : handleRequestOtp}
        disabled={loading || !phone || (otpRequested && !code)}
        className="w-full rounded bg-black p-3 text-white disabled:bg-gray-400"
      >
        {loading ? "Please wait..." : otpRequested ? "Verify & Sign In" : "Send OTP"}
      </button>
    </main>
  );
}
