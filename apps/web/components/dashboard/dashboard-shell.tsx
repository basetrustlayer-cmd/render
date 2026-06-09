"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getConversations, type Conversation } from "../../lib/messages";
import { useAuthStore } from "../../store/auth";

const navItems = [
  { href: "/dashboard",                label: "Overview"       },
  { href: "/dashboard/listings",       label: "Listings"       },
  { href: "/dashboard/create-listing", label: "Create Listing" },
  { href: "/dashboard/safe-deals",     label: "Safe Deals"     },
  { href: "/dashboard/messages",       label: "Messages"       },
  { href: "/dashboard/leads",          label: "Leads"          },
  { href: "/dashboard/profile",        label: "Profile"        },
];

function countUnread(conversations: Conversation[], userId?: string): number {
  if (!userId) return 0;
  return conversations.reduce((total, conversation) => {
    const unread = conversation.messages.filter(
      (m) => m.senderId !== userId && !m.readAt
    ).length;
    return total + unread;
  }, 0);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, accessToken, hydrate } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!accessToken || !user?.id) { setConversations([]); return; }
    const token = accessToken;
    let cancelled = false;
    async function load() {
      try {
        const loaded = await getConversations(token);
        if (!cancelled) setConversations(loaded);
      } catch { /* keep shell stable */ }
    }
    void load();
    return () => { cancelled = true; };
  }, [accessToken, user?.id]);

  const unreadMessageCount = useMemo(
    () => countUnread(conversations, user?.id),
    [conversations, user?.id]
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="rounded-2xl bg-white p-4 shadow-sm md:w-64 md:shrink-0 md:p-5">
          <h2 className="mb-4 text-xl font-bold text-gray-900 md:mb-6">Render</h2>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {navItems.map((item) => {
              // UX-010: unread badge on Messages link
              const isMessages = item.href === "/dashboard/messages";
              const count = unreadMessageCount ?? 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 md:flex"
                >
                  <span>{item.label}</span>
                  {isMessages && count > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-black text-gray-950">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
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
