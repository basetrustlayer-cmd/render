"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtp } from "../../lib/auth";
import { useAuthStore } from "../../store/auth";

export default function LoginPage() {
  const [phone, setPhone] = useState("+233501234567");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  async function handleRequestOtp() {
    setLoading(true);
    setError(null);

    try {
      const result = await requestOtp(phone);
      setDevCode(result.devCode ?? null);
      setStep("VERIFY");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);

    try {
      await login(phone, code);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Secure login
        </p>
        <h1 className="mt-2 text-3xl font-bold">Login with phone OTP</h1>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="mt-6 grid gap-2">
          <span className="text-sm font-medium text-gray-700">Phone number</span>
          <input
            className="w-full rounded-xl border border-gray-300 p-3"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={step === "VERIFY"}
          />
        </label>

        {step === "VERIFY" && (
          <label className="mt-4 grid gap-2">
            <span className="text-sm font-medium text-gray-700">OTP code</span>
            <input
              className="w-full rounded-xl border border-gray-300 p-3"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter 6-digit code"
            />
          </label>
        )}

        {devCode && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Dev OTP: <strong>{devCode}</strong>
          </div>
        )}

        {step === "REQUEST" ? (
          <button
            onClick={handleRequestOtp}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-black p-3 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? "Sending code..." : "Send OTP"}
          </button>
        ) : (
          <button
            onClick={handleVerifyOtp}
            disabled={loading || code.length < 4}
            className="mt-6 w-full rounded-xl bg-black p-3 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? "Verifying..." : "Verify and Sign In"}
          </button>
        )}

        {step === "VERIFY" && (
          <button
            onClick={() => {
              setStep("REQUEST");
              setCode("");
              setDevCode(null);
            }}
            className="mt-3 w-full rounded-xl border border-gray-300 p-3 font-semibold"
          >
            Change phone number
          </button>
        )}
      </div>
    </main>
  );
}
