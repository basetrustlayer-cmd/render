"use client";

import { useEffect, useMemo, useState } from "react";
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
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const { accessToken, user, hydrate } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      if (!accessToken) {
        setLoadingConversations(false);
        return;
      }

      try {
        setError(null);
        setLoadingConversations(true);

        const loaded = await getConversations(accessToken);

        if (cancelled) return;

        setConversations(loaded);
        setSelectedConversationId((current) => requestedConversationId ?? current ?? loaded[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load conversations.");
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, [accessToken, requestedConversationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!accessToken || !selectedConversationId) {
        setMessages([]);
        return;
      }

      try {
        setError(null);
        setLoadingMessages(true);

        const loaded = await getConversationMessages(accessToken, selectedConversationId);

        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load messages.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!accessToken) return;

    const interval = window.setInterval(() => {
      void getConversations(accessToken)
        .then((loaded) => {
          setConversations(loaded);
          setSelectedConversationId((current) => current ?? requestedConversationId ?? loaded[0]?.id ?? null);
        })
        .catch(() => {
          // Keep existing inbox state during transient polling failures.
        });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [accessToken, requestedConversationId]);

  useEffect(() => {
    if (!accessToken || !selectedConversationId) return;

    const interval = window.setInterval(() => {
      void getConversationMessages(accessToken, selectedConversationId)
        .then((loaded) => {
          setMessages((current) => {
            const existingIds = new Set(current.map((message) => message.id));
            const incoming = loaded.filter((message) => !existingIds.has(message.id));
            return incoming.length > 0 ? [...current, ...incoming] : current;
          });
        })
        .catch(() => {
          // Keep current thread during transient polling failures.
        });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [accessToken, selectedConversationId]);

  useEffect(() => {
    if (!accessToken || !user?.id || messages.length === 0) return;

    const unreadIncoming = messages.filter(
      (message) => message.senderId !== user.id && !message.readAt
    );

    if (unreadIncoming.length === 0) return;

    void Promise.allSettled(
      unreadIncoming.map((message) => markMessageRead(accessToken, message.id))
    ).then((results) => {
      const readIds = new Set<string>();

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          readIds.add(unreadIncoming[index].id);
        }
      });

      if (readIds.size === 0) return;

      setMessages((current) =>
        current.map((message) =>
          readIds.has(message.id)
            ? { ...message, readAt: message.readAt ?? new Date().toISOString() }
            : message
        )
      );
    });
  }, [accessToken, messages, user?.id]);

  async function handleSend() {
    const trimmed = body.trim();

    if (!accessToken || !selectedConversationId || !trimmed || sending) {
      return;
    }

    try {
      setError(null);
      setSending(true);

      const created = await sendMessage(accessToken, selectedConversationId, trimmed);

      setMessages((current) => {
        if (current.some((message) => message.id === created.id)) return current;
        return [...current, created];
      });
      setBody("");
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversationId
            ? {
                ...conversation,
                lastMessageAt: created.createdAt,
                messages: [created]
              }
            : conversation
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
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
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: "24px"
        }}
      >
        <aside
          style={{
            border: "1px solid var(--border)",
            borderRadius: "24px",
            background: "#fff",
            overflow: "hidden"
          }}
        >
          <div style={{ padding: "24px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ color: "var(--gold)", fontWeight: 700, margin: 0 }}>Inbox</p>
            <h1 style={{ margin: "8px 0 0", fontSize: "32px" }}>Messages</h1>
          </div>

          {loadingConversations ? (
            <p style={{ padding: "24px", margin: 0, opacity: 0.72 }}>Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p style={{ padding: "24px", margin: 0, opacity: 0.72 }}>No conversations yet.</p>
          ) : (
            <div>
              {conversations.map((conversation, index) => {
                const lastMessage = conversation.messages[0]?.body ?? "No messages yet.";
                const otherUser =
                  conversation.buyerId === user?.id ? conversation.seller : conversation.buyer;
                const unreadCount = conversation.messages.filter(
                  (message) => message.senderId !== user?.id && !message.readAt
                ).length;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "20px 24px",
                      border: "none",
                      borderBottom: index < conversations.length - 1 ? "1px solid var(--border)" : "none",
                      background: conversation.id === selectedConversationId ? "rgba(26, 23, 20, 0.03)" : "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <strong>{otherUser.isBusiness ? "Business seller" : "Marketplace user"}</strong>
                      <span style={{ fontSize: "12px", opacity: 0.6 }}>
                        {formatTime(conversation.lastMessageAt ?? conversation.createdAt)}
                      </span>
                    </div>

                    <p style={{ margin: "6px 0", color: "var(--gold)", fontWeight: 700, fontSize: "13px" }}>
                      {conversation.listing?.title ?? "General conversation"}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <p style={{ margin: 0, fontSize: "14px", opacity: 0.72, lineHeight: 1.5 }}>
                        {lastMessage}
                      </p>
                      {unreadCount > 0 ? (
                        <span style={{ borderRadius: "999px", background: "var(--green)", color: "#fff", padding: "4px 8px", fontSize: "12px", fontWeight: 800 }}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: "24px",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            minHeight: "720px"
          }}
        >
          <header style={{ padding: "24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ margin: 0 }}>
              {selectedConversation?.listing?.title ?? "Conversation"}
            </h2>
            <p style={{ margin: "6px 0 0", opacity: 0.72 }}>
              {selectedConversation
                ? `Conversation ${selectedConversation.id.slice(0, 8)}`
                : "Select a conversation"}
            </p>
          </header>

          {error ? (
            <div style={{ margin: "24px 24px 0", padding: "14px 16px", borderRadius: "16px", background: "#fff1f1", color: "#9f1239" }}>
              {error}
            </div>
          ) : null}

          <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {loadingMessages ? (
              <p style={{ margin: 0, opacity: 0.72 }}>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.72 }}>No messages in this conversation yet.</p>
            ) : (
              messages.map((message) => {
                const isMine = message.senderId === user?.id;

                return (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: isMine ? "flex-end" : "flex-start",
                      maxWidth: "70%"
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: "18px",
                        background: isMine ? "var(--ink)" : "rgba(26, 23, 20, 0.06)",
                        color: isMine ? "#fff" : "var(--ink)"
                      }}
                    >
                      {message.body}
                    </div>
                    <p style={{ margin: "6px 4px 0", fontSize: "12px", opacity: 0.55 }}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <footer style={{ padding: "24px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type your message..."
                disabled={!selectedConversationId || sending}
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  fontSize: "16px"
                }}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!selectedConversationId || !body.trim() || sending}
                style={{
                  padding: "16px 24px",
                  borderRadius: "16px",
                  border: "none",
                  background: "var(--green)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: !selectedConversationId || !body.trim() || sending ? "not-allowed" : "pointer",
                  opacity: !selectedConversationId || !body.trim() || sending ? 0.6 : 1
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
