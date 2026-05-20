import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Render.com.gh — Ghana's Verified Marketplace",
  description: "Ghana's verified marketplace powered by TrustLayer."
};

function Header() {
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
          <Link
            href="/login"
            className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-black"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-gray-600">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Render.com.gh. Verified marketplace for Ghana.
          </p>
          <p>Powered by TrustLayer identity verification and Safe Deal escrow.</p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
