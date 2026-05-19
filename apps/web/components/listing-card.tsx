import { TrustScoreBadge } from "./trust-score-badge";

type ListingCardProps = {
  title: string;
  price: string;
  location: string;
  category: string;
  trustScore: number;
  tier: string;
  verified: boolean;
};

export function ListingCard({
  title,
  price,
  location,
  category,
  trustScore,
  tier,
  verified
}: ListingCardProps) {
  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: "22px",
        padding: "20px",
        background: "#fff",
        boxShadow: "0 12px 30px rgba(26, 23, 20, 0.06)"
      }}
    >
      <div
        style={{
          height: "160px",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, rgba(200,144,42,0.22), rgba(26,107,60,0.18))",
          marginBottom: "18px"
        }}
      />

      <p style={{ color: "var(--gold)", margin: 0, fontWeight: 700 }}>
        {category}
      </p>

      <h3 style={{ margin: "8px 0", fontSize: "22px" }}>{title}</h3>

      <p style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 800 }}>
        {price}
      </p>

      <p style={{ margin: "0 0 16px", opacity: 0.72 }}>{location}</p>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <TrustScoreBadge score={trustScore} tier={tier} />
        {verified ? (
          <span
            style={{
              color: "var(--green)",
              fontWeight: 800,
              fontSize: "13px"
            }}
          >
            ✓ Verified
          </span>
        ) : null}
      </div>
    </article>
  );
}
