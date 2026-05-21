"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";

export default function LoginPage() {
  const [phone, setPhone] = useState("+233501234567");
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);

    try {
      await login(phone);

      router.push("/dashboard");
    } catch (err) {
      console.error("LOGIN_RUNTIME_ERROR", err);

      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err, null, 2);

      alert(`LOGIN ERROR\n\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-3xl font-bold">Login</h1>

      <input
        className="mb-4 w-full rounded border p-3"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded bg-black p-3 text-white disabled:bg-gray-400"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </main>
  );
}
