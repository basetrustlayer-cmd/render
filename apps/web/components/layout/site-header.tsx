"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getConversations, type Conversation } from "../../lib/messages";
import { useAuthStore } from "../../store/auth";

function countUnread(conversations: Conversation[], userId?: string): number {
  if (!userId) return 0;

  return conversations.reduce((total, conversation) => {
    const unread = conversation.messages.filter(
      (message) => message.senderId !== userId && !message.readAt
    ).length;

    return total + unread;
  }, 0);
}

export function SiteHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!accessToken || !user?.id) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    const token = accessToken;

    async function loadUnread() {
      try {
        const loaded = await getConversations(token);

        if (!cancelled) {
          setConversations(loaded);
        }
      } catch {
        // Keep header stable during transient API failures.
      }
    }

    void loadUnread();

    const interval = window.setInterval(() => {
      void loadUnread();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken, user?.id]);

  const unreadCount = useMemo(() => countUnread(conversations, user?.id), [conversations, user?.id]);

  function handleLogout() {
    logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900">
          Render<span className="text-amber-600">.com.gh</span>
        </Link>

        <nav className="flex w-full flex-wrap items-center gap-3 text-sm font-medium text-gray-700 md:w-auto md:gap-6">
          <Link href="/listings" className="hover:text-gray-900">
            Browse Listings
          </Link>
          <Link href="/verify" className="hover:text-gray-900">
            Get Verified
          </Link>
          <Link href="/listings" className="hover:text-gray-900">
            Safe Deal
          </Link>

          {user ? (
            <>
              <Link href="/messages" className="relative hover:text-gray-900">
                Messages
                {unreadCount > 0 ? (
                  <span className="absolute -right-4 -top-3 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
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
