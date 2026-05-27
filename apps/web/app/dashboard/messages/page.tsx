"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { getConversations, type Conversation } from "../../../lib/messages";
import { useAuthStore } from "../../../store/auth";

function formatTime(value: string | null): string {
  if (!value) return "New";

  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function countUnread(conversation: Conversation, userId?: string): number {
  if (!userId) return 0;

  return conversation.messages.filter((message) => message.senderId !== userId && !message.readAt).length;
}

function getRole(conversation: Conversation, userId?: string): "Seller" | "Buyer" {
  return conversation.sellerId === userId ? "Seller" : "Buyer";
}

export default function DashboardMessagesPage() {
  const { accessToken, user, hydrate } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadConversations() {
      try {
        setError(null);
        setLoading(true);

        const loaded = await getConversations(accessToken);

        if (!cancelled) {
          setConversations(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard messages.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadConversations();

    const interval = window.setInterval(() => {
      void loadConversations();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [accessToken]);

  const sellerThreads = useMemo(
    () => conversations.filter((conversation) => conversation.sellerId === user?.id),
    [conversations, user?.id]
  );

  const buyerThreads = useMemo(
    () => conversations.filter((conversation) => conversation.buyerId === user?.id),
    [conversations, user?.id]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + countUnread(conversation, user?.id), 0),
    [conversations, user?.id]
  );

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Seller inquiries</p>
            <strong className="mt-2 block text-3xl text-gray-950">{sellerThreads.length}</strong>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Buyer conversations</p>
            <strong className="mt-2 block text-3xl text-gray-950">{buyerThreads.length}</strong>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Unread messages</p>
            <strong className="mt-2 block text-3xl text-emerald-700">{unreadTotal}</strong>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5">
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Message Center</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Buyer & Seller Conversations</h2>
            <p className="mt-2 text-sm text-gray-600">
              Monitor inquiries, buyer questions, and listing-linked conversations from one dashboard.
            </p>
          </div>

          {error ? (
            <div className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <p className="p-5 text-sm text-gray-600">Loading messages...</p>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-xl font-bold text-gray-950">No conversations yet</h3>
              <p className="mt-2 text-sm text-gray-600">
                Buyer inquiries and seller responses will appear here once messaging starts.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const unreadCount = countUnread(conversation, user?.id);
                const preview = conversation.messages[0]?.body ?? "No messages yet.";
                const role = getRole(conversation, user?.id);

                return (
                  <Link
                    key={conversation.id}
                    href={`/messages?conversation=${conversation.id}`}
                    className="grid gap-3 p-5 hover:bg-gray-50 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                          {role}
                        </span>
                        {conversation.listing ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                            {conversation.listing.title}
                          </span>
                        ) : null}
                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                            {unreadCount} unread
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-sm text-gray-600">{preview}</p>
                    </div>

                    <div className="text-sm text-gray-500">
                      {formatTime(conversation.lastMessageAt ?? conversation.createdAt)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
