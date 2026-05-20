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
    } catch {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      <input
        className="w-full border rounded p-3 mb-4"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-black text-white rounded p-3"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </main>
  );
}
