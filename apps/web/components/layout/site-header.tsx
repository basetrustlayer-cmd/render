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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!accessToken || !user?.id) { setConversations([]); return; }
    let cancelled = false;
    const token = accessToken;

    async function loadUnread() {
      try {
        const loaded = await getConversations(token);
        if (!cancelled) setConversations(loaded);
      } catch { /* keep header stable */ }
    }

    void loadUnread();
    const interval = window.setInterval(() => void loadUnread(), 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [accessToken, user?.id]);

  const unreadCount = useMemo(
    () => countUnread(conversations, user?.id),
    [conversations, user?.id]
  );

  function handleLogout() {
    logout();
    setMobileOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

        {/* Logo */}
        <Link href="/" className="shrink-0 text-xl font-black tracking-tight text-gray-950 sm:text-2xl">
          Render<span className="text-amber-500">.com.gh</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/listings">Browse</NavLink>
          <NavLink href="/verify">Get Verified</NavLink>

          {user ? (
            <>
              <NavLink href="/messages" badge={unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : undefined}>
                Messages
              </NavLink>
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition"
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black transition"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard/create-listing"
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-gray-950 hover:bg-amber-400 transition"
              >
                Sell something
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile: right side */}
        <div className="flex items-center gap-2 md:hidden">
          {user && unreadCount > 0 && (
            <Link href="/messages" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700">
              <span className="text-xs font-black">✉</span>
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700"
            aria-label="Toggle menu"
          >
            <span className="text-lg">{mobileOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <MobileNavLink href="/listings" onClick={() => setMobileOpen(false)}>Browse listings</MobileNavLink>
            <MobileNavLink href="/verify" onClick={() => setMobileOpen(false)}>Get verified</MobileNavLink>
            {user ? (
              <>
                <MobileNavLink href="/messages" onClick={() => setMobileOpen(false)}>
                  Messages {unreadCount > 0 && <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">{unreadCount}</span>}
                </MobileNavLink>
                <MobileNavLink href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</MobileNavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 w-full rounded-xl bg-gray-950 px-4 py-3 text-left text-sm font-semibold text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <MobileNavLink href="/login" onClick={() => setMobileOpen(false)}>Sign in</MobileNavLink>
                <Link
                  href="/dashboard/create-listing"
                  onClick={() => setMobileOpen(false)}
                  className="mt-1 block rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-gray-950"
                >
                  Sell something
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children, badge }: { href: string; children: React.ReactNode; badge?: string }) {
  return (
    <Link
      href={href}
      className="relative rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-950 transition"
    >
      {children}
      {badge && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}
