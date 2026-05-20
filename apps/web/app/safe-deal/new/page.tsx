import Link from "next/link";

export default function NewSafeDealPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 32 }}>
      <Link href="/listings" style={{ textDecoration: "underline", fontSize: 14 }}>
        ← Back to listings
      </Link>

      <section
        style={{
          marginTop: 24,
          background: "#ffffff",
          border: "1px solid #e5e5e5",
          borderRadius: 24,
          padding: 32
        }}
      >
        <p style={{ color: "#b7791f", fontWeight: 700, marginBottom: 8 }}>
          Safe Deal
        </p>

        <h1
          style={{
            fontSize: "3rem",
            lineHeight: 1.1,
            fontWeight: 800,
            margin: "0 0 16px"
          }}
        >
          Protected Transaction Checkout
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            color: "#555",
            maxWidth: 720
          }}
        >
          Funds are held securely until the buyer confirms that the item was
          received and inspected.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 24,
            gridTemplateColumns: "2fr 1fr"
          }}
        >
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 20,
              padding: 24
            }}
          >
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
              Transaction Details
            </h2>

            {[
              ["Listing", "Toyota Corolla 2015"],
              ["Seller", "Verified Render Seller"],
              ["Purchase Price", "GH₵ 65,000"],
              ["Buyer Protection Fee", "GH₵ 975"],
              ["Inspection Window", "3 Days"],
              ["Total to Fund", "GH₵ 65,975"]
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #f1f1f1"
                }}
              >
                <span style={{ color: "#666" }}>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              border: "1px solid #d7f3e6",
              background: "#eefaf4",
              borderRadius: 20,
              padding: 24
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
              Buyer Protection
            </h3>

            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                lineHeight: 2
              }}
            >
              <li>Funds held in escrow</li>
              <li>3-day inspection period</li>
              <li>Dispute mediation</li>
              <li>Verified seller identity</li>
            </ul>

            <button
              style={{
                marginTop: 24,
                width: "100%",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 18px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Fund Safe Deal
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
