import Link from "next/link";

const categories = [
  { label: "Vehicles", href: "/listings?category=VEHICLES" },
  { label: "Real Estate", href: "/listings?category=REAL_ESTATE" },
  { label: "Electronics", href: "/listings?category=ELECTRONICS" },
  { label: "Jobs", href: "/listings?category=JOBS" },
  { label: "Services", href: "/listings?category=SERVICES" },
  { label: "Fashion", href: "/listings?category=FASHION" }
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
          <Link href="/listings" style={{ borderRadius: "999px", padding: "12px 18px", background: "#111", color: "#fff", textDecoration: "none" }}>
            Browse Listings
          </Link>

          <Link href="/listings/new" style={{ border: "1px solid var(--border)", borderRadius: "999px", padding: "12px 18px", background: "#fff", color: "#111", textDecoration: "none" }}>
            Create Listing
          </Link>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
          {categories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                textDecoration: "none"
              }}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
