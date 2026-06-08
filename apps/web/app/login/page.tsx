"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { requestOtp } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  async function handleRequestOtp() {
    setLoading(true);
    setError(null);
    try {
      await requestOtp(phone);
      setOtpRequested(true);
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);
    try {
      await login(phone, code);
      const result = await apiFetch<{ profile?: { email?: string | null }; user?: { email?: string | null } }>("/auth/me");
      const email = result.profile?.email ?? result.user?.email ?? null;
      router.push(email ? next : "/complete-profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to sign in.";
      if (msg.includes("401") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setError("That code didn't match or has expired. Check the SMS and try again.");
      } else if (msg.toLowerCase().includes("attempts")) {
        setError("Too many attempts. Request a new code below.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-start justify-center bg-gray-50 px-4 py-12 sm:py-20">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-600">
            Ghana's verified marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950">
            {otpRequested ? "Enter your code" : "Sign in"}
          </h1>
          <p className="mt-2 text-base text-gray-600 leading-relaxed">
            {otpRequested
              ? `We sent a 6-digit code to +233 ${phone}. It expires in 10 minutes.`
              : "No password needed — we use your Ghana mobile number."}
          </p>
        </div>

        {/* Phone input (always visible) */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Mobile number
          </label>
          <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <div className="flex items-center gap-2 border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
              🇬🇭 <span>+233</span>
            </div>
            <input
              className="flex-1 bg-transparent px-4 py-3 text-gray-950 outline-none placeholder:text-gray-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              placeholder="0241 234 567"
              disabled={otpRequested}
              autoFocus={!otpRequested}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            MTN, Vodafone, AirtelTigo — any Ghana number works.
          </p>
        </div>

        {/* OTP input */}
        {otpRequested && (
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              6-digit code
            </label>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.35em] text-gray-950 shadow-sm outline-none placeholder:text-gray-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="——————"
              autoFocus
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={otpRequested ? handleVerifyOtp : handleRequestOtp}
          disabled={loading || !phone || (otpRequested && code.length < 6)}
          className="w-full rounded-2xl bg-gray-950 px-5 py-4 text-base font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        >
          {loading
            ? otpRequested ? "Signing in…" : "Sending code…"
            : otpRequested ? "Verify & continue" : "Send verification code"}
        </button>

        {/* Resend */}
        {otpRequested && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setOtpRequested(false); setCode(""); setError(null); }}
              disabled={resendCooldown}
              className="text-sm font-semibold text-gray-600 hover:text-gray-950 disabled:cursor-not-allowed disabled:text-gray-400 transition"
            >
              {resendCooldown ? "Wait 60 seconds to resend" : "← Change number or resend"}
            </button>
          </div>
        )}

        {/* Trust footnote */}
        {!otpRequested && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 text-sm">
              {[
                ["🔒", "Your number is never shared with sellers"],
                ["✅", "Verified by TrustLayer identity infrastructure"],
                ["🛡️", "Safe Deal escrow protects every transaction"],
              ].map(([icon, copy]) => (
                <div key={copy} className="contents">
                  <span className="text-base">{icon}</span>
                  <span className="text-gray-600">{copy}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline hover:text-gray-700">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
