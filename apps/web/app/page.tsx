const categories = [
  "Vehicles",
  "Real Estate",
  "Electronics",
  "Jobs",
  "Services",
  "Fashion"
];

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          border: "1px solid var(--border)",
          borderRadius: "28px",
          padding: "48px",
          background: "rgba(255,255,255,0.45)"
        }}
      >
        <p style={{ color: "var(--gold)", fontWeight: 700 }}>
          Powered by TrustLayer
        </p>

        <h1 style={{ fontSize: "56px", lineHeight: 1, margin: "16px 0" }}>
          Ghana&apos;s verified marketplace.
        </h1>

        <p style={{ fontSize: "20px", maxWidth: "680px", lineHeight: 1.6 }}>
          Buy and sell with confidence using verified seller identity,
          TrustScore reputation, messaging, reviews, and Safe Deal escrow.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "32px" }}>
          {categories.map((category) => (
            <span
              key={category}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "10px 16px",
                background: "#fff"
              }}
            >
              {category}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
