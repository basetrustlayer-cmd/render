import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/create-listing", label: "Create Listing" },
  { href: "/dashboard/safe-deals", label: "Safe Deals" },
  { href: "/dashboard/profile", label: "Profile" }
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl bg-white p-5 shadow-sm md:block">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Render</h2>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Buyer & Seller Dashboard</p>
            <h1 className="text-2xl font-bold text-gray-900">Render.com.gh Marketplace</h1>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
