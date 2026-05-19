const conversations = [
  {
    id: "1",
    seller: "Kofi Auto Hub",
    listing: "Toyota Corolla 2018",
    lastMessage: "The car is still available and can be inspected today.",
    time: "2m ago",
    unread: 2
  },
  {
    id: "2",
    seller: "Ama Properties",
    listing: "2 Bedroom Apartment",
    lastMessage: "Utilities are included in the monthly rent.",
    time: "1h ago",
    unread: 0
  },
  {
    id: "3",
    seller: "Kwesi Electronics",
    listing: "iPhone 14 Pro",
    lastMessage: "Battery health is 92% and Face ID works perfectly.",
    time: "Yesterday",
    unread: 0
  }
];

const thread = [
  {
    id: "1",
    sender: "seller",
    body: "Hello! The vehicle is still available.",
    time: "10:15 AM"
  },
  {
    id: "2",
    sender: "buyer",
    body: "Great. Can I inspect it this afternoon?",
    time: "10:17 AM"
  },
  {
    id: "3",
    sender: "seller",
    body: "Yes, 3 PM at East Legon works.",
    time: "10:18 AM"
  }
];

export default function MessagesPage() {
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
            <p style={{ color: "var(--gold)", fontWeight: 700, margin: 0 }}>
              Inbox
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: "32px" }}>Messages</h1>
          </div>

          <div>
            {conversations.map((conversation, index) => (
              <div
                key={conversation.id}
                style={{
                  padding: "20px 24px",
                  borderBottom:
                    index < conversations.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  background:
                    conversation.id === "1"
                      ? "rgba(26, 23, 20, 0.03)"
                      : "#fff"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px"
                  }}
                >
                  <strong>{conversation.seller}</strong>
                  <span style={{ fontSize: "12px", opacity: 0.6 }}>
                    {conversation.time}
                  </span>
                </div>

                <p
                  style={{
                    margin: "6px 0",
                    color: "var(--gold)",
                    fontWeight: 700,
                    fontSize: "13px"
                  }}
                >
                  {conversation.listing}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    opacity: 0.72,
                    lineHeight: 1.5
                  }}
                >
                  {conversation.lastMessage}
                </p>

                {conversation.unread > 0 ? (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "10px",
                      padding: "4px 8px",
                      borderRadius: "999px",
                      background: "var(--green)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 800
                    }}
                  >
                    {conversation.unread} new
                  </span>
                ) : null}
              </div>
            ))}
          </div>
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
          <header
            style={{
              padding: "24px",
              borderBottom: "1px solid var(--border)"
            }}
          >
            <h2 style={{ margin: 0 }}>Kofi Auto Hub</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.72 }}>
              Toyota Corolla 2018
            </p>
          </header>

          <div
            style={{
              flex: 1,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            {thread.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf:
                    message.sender === "buyer"
                      ? "flex-end"
                      : "flex-start",
                  maxWidth: "70%"
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: "18px",
                    background:
                      message.sender === "buyer"
                        ? "var(--ink)"
                        : "rgba(26, 23, 20, 0.06)",
                    color:
                      message.sender === "buyer"
                        ? "#fff"
                        : "var(--ink)"
                  }}
                >
                  {message.body}
                </div>
                <p
                  style={{
                    margin: "6px 4px 0",
                    fontSize: "12px",
                    opacity: 0.55
                  }}
                >
                  {message.time}
                </p>
              </div>
            ))}
          </div>

          <footer
            style={{
              padding: "24px",
              borderTop: "1px solid var(--border)"
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                placeholder="Type your message..."
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
                style={{
                  padding: "16px 24px",
                  borderRadius: "16px",
                  border: "none",
                  background: "var(--green)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "16px"
                }}
              >
                Send
              </button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
