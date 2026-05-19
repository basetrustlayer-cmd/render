import { TrustScoreBadge } from "../../../components/trust-score-badge";

type ListingDetailPageProps = {
  params: {
    id: string;
  };
};

const reviews = [
  {
    id: "1",
    reviewer: "Kwame A.",
    rating: 5,
    body: "Excellent seller. Vehicle matched the description exactly."
  },
  {
    id: "2",
    reviewer: "Ama O.",
    rating: 4,
    body: "Smooth transaction and quick communication."
  }
];

export default function ListingDetailPage({
  params
}: ListingDetailPageProps) {
  return (
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "28px"
        }}
      >
        <div>
          <div
            style={{
              height: "420px",
              borderRadius: "28px",
              background:
                "linear-gradient(135deg, rgba(200,144,42,0.22), rgba(26,107,60,0.18))",
              marginBottom: "24px"
            }}
          />

          <p style={{ color: "var(--gold)", fontWeight: 700, margin: 0 }}>
            Vehicles
          </p>

          <h1 style={{ fontSize: "48px", margin: "12px 0" }}>
            Toyota Corolla 2018
          </h1>

          <p style={{ fontSize: "36px", fontWeight: 800, margin: "0 0 12px" }}>
            GH₵ 145,000
          </p>

          <p style={{ opacity: 0.72, marginBottom: "28px" }}>
            East Legon, Accra · Listing ID: {params.id}
          </p>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "24px",
              padding: "24px",
              background: "#fff"
            }}
          >
            <h2>Description</h2>
            <p style={{ lineHeight: 1.8 }}>
              Well-maintained, accident-free vehicle with full service history.
              Clean interior, fuel efficient, and ready for immediate transfer.
            </p>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "24px",
              padding: "24px",
              background: "#fff",
              marginTop: "24px"
            }}
          >
            <h2>Recent Reviews</h2>

            <div style={{ display: "grid", gap: "16px" }}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "16px"
                  }}
                >
                  <strong>
                    {review.reviewer} · {"★".repeat(review.rating)}
                  </strong>
                  <p style={{ marginTop: "8px", lineHeight: 1.7 }}>
                    {review.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside
          style={{
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "24px",
            background: "#fff",
            height: "fit-content",
            position: "sticky",
            top: "24px"
          }}
        >
          <p style={{ marginTop: 0, fontWeight: 700 }}>Seller</p>

          <h3 style={{ marginTop: "8px" }}>Kofi Auto Hub</h3>

          <div style={{ margin: "16px 0" }}>
            <TrustScoreBadge score={910} tier="TRUSTED" />
          </div>

          <p
            style={{
              color: "var(--green)",
              fontWeight: 800,
              marginBottom: "24px"
            }}
          >
            ✓ Verified Seller
          </p>

          <button
            type="button"
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background: "var(--ink)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "16px",
              marginBottom: "12px"
            }}
          >
            Message Seller
          </button>

          <button
            type="button"
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "none",
              background: "var(--green)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "16px"
            }}
          >
            Buy with Safe Deal
          </button>

          <p
            style={{
              marginTop: "16px",
              fontSize: "14px",
              opacity: 0.72,
              lineHeight: 1.6
            }}
          >
            Funds are held securely until you confirm delivery.
          </p>
        </aside>
      </section>
    </main>
  );
}
