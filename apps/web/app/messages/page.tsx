"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getConversationMessages,
  getConversations,
  markMessageRead,
  sendMessage,
  type Conversation,
  type Message
} from "../../lib/messages";
import { useAuthStore } from "../../store/auth";

function formatTime(value: string | null): string {
  if (!value) return "New";
  return new Intl.DateTimeFormat("en-GH", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }).format(new Date(value));
}

function formatMoney(value?: number | null): string {
  if (typeof value !== "number") return "";
  return `GH₵ ${value.toLocaleString("en-GH")}`;
}

function getParticipantLabel(input: { isBusiness: boolean; trustTier: string | null; verificationLevel: number }): string {
  if (input.isBusiness) return "Business Seller";
  if (input.verificationLevel > 0) return "TrustLayer-reviewed user";
  return "Marketplace User";
}

function getTrustLabel(input: { isBusiness: boolean; trustTier: string | null; verificationLevel: number }): string {
  return input.trustTier ?? "Pending TrustLayer sync";
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const requestedDraft = searchParams.get("draft");
  const { accessToken, user, hydrate } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (requestedDraft) setBody((c) => c || requestedDraft);
  }, [requestedDraft]);

  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      if (!accessToken) { setLoadingConversations(false); return; }
      try {
        setError(null); setLoadingConversations(true);
        const loaded = await getConversations(accessToken);
        if (cancelled) return;
        setConversations(loaded);
        setSelectedConversationId((c) => requestedConversationId ?? c ?? loaded[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load conversations.");
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }
    void loadConversations();
    return () => { cancelled = true; };
  }, [accessToken, requestedConversationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMessages() {
      if (!accessToken || !selectedConversationId) { setMessages([]); return; }
      try {
        setError(null); setLoadingMessages(true);
        const loaded = await getConversationMessages(accessToken, selectedConversationId);
        if (!cancelled) setMessages(loaded);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load messages.");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    void loadMessages();
    return () => { cancelled = true; };
  }, [accessToken, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!accessToken) return;
    const interval = window.setInterval(() => {
      void getConversations(accessToken)
        .then((loaded) => {
          setConversations(loaded);
          setSelectedConversationId((c) => c ?? requestedConversationId ?? loaded[0]?.id ?? null);
        }).catch(() => {});
    }, 10000);
    return () => window.clearInterval(interval);
  }, [accessToken, requestedConversationId]);

  useEffect(() => {
    if (!accessToken || !selectedConversationId) return;
    const interval = window.setInterval(() => {
      void getConversationMessages(accessToken, selectedConversationId)
        .then((loaded) => {
          setMessages((current) => {
            const existingIds = new Set(current.map((m) => m.id));
            const incoming = loaded.filter((m) => !existingIds.has(m.id));
            return incoming.length > 0 ? [...current, ...incoming] : current;
          });
        }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(interval);
  }, [accessToken, selectedConversationId]);

  useEffect(() => {
    if (!accessToken || !user?.id || messages.length === 0) return;
    const unreadIncoming = messages.filter((m) => m.senderId !== user.id && !m.readAt);
    if (unreadIncoming.length === 0) return;
    void Promise.allSettled(unreadIncoming.map((m) => markMessageRead(accessToken, m.id)))
      .then((results) => {
        const readIds = new Set<string>();
        results.forEach((r, i) => { if (r.status === "fulfilled") readIds.add(unreadIncoming[i].id); });
        if (readIds.size === 0) return;
        const readAt = new Date().toISOString();
        setMessages((c) => c.map((m) => readIds.has(m.id) ? { ...m, readAt: m.readAt ?? readAt } : m));
        setConversations((c) => c.map((conv) => ({
          ...conv,
          messages: conv.messages.map((m) => readIds.has(m.id) ? { ...m, readAt: m.readAt ?? readAt } : m)
        })));
      });
  }, [accessToken, messages, user?.id]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!accessToken) { setError("Please log in again before sending a message."); return; }
    if (!selectedConversationId) { setError("Select a conversation before sending."); return; }
    if (!trimmed) { setError("Type a message before sending."); return; }
    if (sending) return;
    try {
      setError(null); setSendError(null); setSending(true);
      const created = await sendMessage(accessToken, selectedConversationId, trimmed);
      setMessages((c) => c.some((m) => m.id === created.id) ? c : [...c, created]);
      setBody("");
      setConversations((c) => c.map((conv) =>
        conv.id === selectedConversationId
          ? { ...conv, lastMessageAt: created.createdAt, messages: [created] }
          : conv
      ));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  if (!accessToken) {
    return (
      <main style={{ minHeight: "100vh", padding: "32px" }}>
        <section style={{ maxWidth: "760px", margin: "0 auto", border: "1px solid var(--border)", borderRadius: "24px", padding: "32px", background: "#fff" }}>
          <p style={{ color: "var(--gold)", fontWeight: 700, margin: 0 }}>Inbox</p>
          <h1 style={{ margin: "8px 0 12px", fontSize: "32px" }}>Messages</h1>
          <p style={{ margin: 0, opacity: 0.72 }}>Please sign in to view and send messages.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <aside style={{ border: "1px solid var(--border)", borderRadius: "24px", background: "#fff", overflow: "hidden" }} className="w-full min-w-0">
          <div style={{ padding: "24px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ color: "var(--gold)", fontWeight: 700, margin: 0 }}>Inbox</p>
            <h1 style={{ margin: "8px 0 0", fontSize: "32px" }}>Messages</h1>
          </div>

          {loadingConversations ? (
            <p style={{ padding: "24px", margin: 0, opacity: 0.72 }}>Loading conversations...</p>
          ) : conversations.length === 0 ? (
            // PL-006: empty state for new users
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <div style={{ margin: "0 auto 16px", height: "52px", width: "52px", borderRadius: "999px", background: "rgba(200, 144, 42, 0.12)", display: "grid", placeItems: "center", fontSize: "22px" }}>
                ✉
              </div>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "15px" }}>No messages yet</p>
              <p style={{ margin: "0 0 16px", fontSize: "13px", opacity: 0.65, lineHeight: 1.6 }}>
                Start a conversation by messaging a seller, or share your listings to receive buyer enquiries.
              </p>
              <Link
                href="/listings"
                style={{ display: "inline-block", borderRadius: "12px", background: "#1A1714", color: "#fff", padding: "10px 18px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}
              >
                Browse listings
              </Link>
            </div>
          ) : (
            <div>
              {conversations.map((conversation, index) => {
                const lastMessage = conversation.messages[0]?.body ?? "No messages yet.";
                const otherUser = conversation.buyerId === user?.id ? conversation.seller : conversation.buyer;
                const unreadCount = conversation.messages.filter(
                  (m) => m.senderId !== user?.id && !m.readAt
                ).length;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "20px 24px", border: "none",
                      borderBottom: index < conversations.length - 1 ? "1px solid var(--border)" : "none",
                      background: conversation.id === selectedConversationId ? "rgba(26,23,20,0.03)" : "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <strong>{getParticipantLabel(otherUser)}</strong>
                      <span style={{ fontSize: "12px", opacity: 0.6 }}>
                        {formatTime(conversation.lastMessageAt ?? conversation.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0", color: "var(--gold)", fontWeight: 700, fontSize: "13px" }}>
                      {conversation.listing
                        ? `${conversation.listing.title} · ${formatMoney(conversation.listing.price)}`
                        : "General conversation"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <p style={{ margin: 0, fontSize: "14px", opacity: 0.72, lineHeight: 1.5 }}>{lastMessage}</p>
                      {unreadCount > 0 && (
                        <span style={{ borderRadius: "999px", background: "var(--green)", color: "#fff", padding: "4px 8px", fontSize: "12px", fontWeight: 800 }}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section style={{ border: "1px solid var(--border)", borderRadius: "24px", background: "#fff", display: "flex", flexDirection: "column", minHeight: "min(720px, calc(100vh - 48px))" }}>
          <header style={{ padding: "24px", borderBottom: "1px solid var(--border)" }}>
            {selectedConversation ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 style={{ margin: 0 }}>{selectedConversation.listing?.title ?? "Conversation"}</h2>
                  <p style={{ margin: "6px 0 0", opacity: 0.72 }}>
                    {getParticipantLabel(selectedConversation.buyerId === user?.id ? selectedConversation.seller : selectedConversation.buyer)}
                    {" · "}
                    {getTrustLabel(selectedConversation.buyerId === user?.id ? selectedConversation.seller : selectedConversation.buyer)}
                    {selectedConversation.listing ? ` · ${formatMoney(selectedConversation.listing.price)}` : ""}
                  </p>
                </div>
                {selectedConversation.listingId && (
                  <a
                    href={`/safe-deal/new?listingId=${selectedConversation.listingId}&conversationId=${selectedConversation.id}`}
                    style={{ borderRadius: "14px", background: "var(--gold)", color: "var(--ink)", padding: "12px 16px", fontSize: "14px", fontWeight: 900, textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    Start Safe Deal
                  </a>
                )}
              </div>
            ) : (
              <>
                <h2 style={{ margin: 0 }}>Conversation</h2>
                <p style={{ margin: "6px 0 0", opacity: 0.72 }}>Select a conversation</p>
              </>
            )}
          </header>

          {error && (
            <div style={{ margin: "24px 24px 0", padding: "14px 16px", borderRadius: "16px", background: "#fff1f1", color: "#9f1239" }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {loadingMessages ? (
              <p style={{ margin: 0, opacity: 0.72 }}>Loading messages...</p>
            ) : messages.length === 0 ? (
              <div style={{ margin: "auto", maxWidth: "520px", textAlign: "center" }}>
                <div style={{ margin: "0 auto 16px", height: "56px", width: "56px", borderRadius: "999px", background: "rgba(16,185,129,0.12)", display: "grid", placeItems: "center", color: "var(--green)", fontWeight: 900 }}>
                  ✉
                </div>
                <h3 style={{ margin: 0, fontSize: "24px" }}>Start the conversation</h3>
                <p style={{ margin: "10px 0 0", opacity: 0.72, lineHeight: 1.6 }}>
                  Ask about availability, inspection, payment terms, or Safe Deal before making any commitment.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.senderId === user?.id;
                return (
                  <div key={message.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "min(100%, 640px)" }}>
                    <div style={{ padding: "14px 18px", borderRadius: "18px", background: isMine ? "var(--ink)" : "rgba(26,23,20,0.06)", color: isMine ? "#fff" : "var(--ink)" }}>
                      {message.body}
                    </div>
                    <p style={{ margin: "6px 4px 0", fontSize: "12px", opacity: 0.55 }}>{formatTime(message.createdAt)}</p>
                  </div>
                );
              })
            )}
          </div>

          <footer className="p-4 sm:p-6" style={{ borderTop: "1px solid var(--border)" }}>
            {sendError && (
              <div style={{ marginBottom: "12px", padding: "12px 14px", borderRadius: "14px", background: "#fff1f1", color: "#9f1239", fontSize: "14px" }}>
                {sendError}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void handleSend(); }} className="flex flex-col gap-3 sm:flex-row">
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSend(); } }}
                placeholder="Type your message..."
                disabled={!selectedConversationId || sending}
                style={{ flex: 1, padding: "16px", borderRadius: "16px", border: "1px solid var(--border)", fontSize: "16px" }}
              />
              <button
                type="submit"
                disabled={sending || !selectedConversationId}
                style={{ padding: "16px 24px", borderRadius: "16px", border: "none", background: "var(--green)", color: "#fff", fontWeight: 800, fontSize: "16px", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </footer>
        </section>
      </section>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", padding: "32px" }}>Loading messages...</main>}>
      <MessagesContent />
    </Suspense>
  );
}
