import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/create-listing", label: "Create Listing" },
  { href: "/dashboard/safe-deals", label: "Safe Deals" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/profile", label: "Profile" }
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="rounded-2xl bg-white p-4 shadow-sm md:w-64 md:shrink-0 md:p-5">
          <h2 className="mb-4 text-xl font-bold text-gray-900 md:mb-6">Render</h2>

          <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 md:block"
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
