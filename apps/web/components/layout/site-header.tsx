"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "../../store/auth";

export function SiteHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">
          Render<span className="text-amber-600">.com.gh</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link href="/listings" className="hover:text-gray-900">
            Browse Listings
          </Link>
          <Link href="/verify" className="hover:text-gray-900">
            Get Verified
          </Link>
          <Link href="/safe-deal/new" className="hover:text-gray-900">
            Safe Deal
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
