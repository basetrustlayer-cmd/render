import Link from "next/link";

type PageProps = {
  params: {
    id: string;
  };
};

const steps = [
  { label: "Initiated", complete: true },
  { label: "Funded", complete: true },
  { label: "Delivered", complete: false },
  { label: "Inspection", complete: false },
  { label: "Released", complete: false }
];

export default function SafeDealDetailPage({ params }: PageProps) {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 32 }}>
      <Link href="/listings" style={{ textDecoration: "underline", fontSize: 14 }}>
        ← Back to listing
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
          Transaction #{params.id.slice(0, 8).toUpperCase()}
        </h1>

        <div
          style={{
            marginTop: 32,
            display: "grid",
            gap: 12
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 16,
                borderRadius: 12,
                background: step.complete ? "#eefaf4" : "#f8f8f8",
                border: "1px solid #e5e5e5"
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: step.complete ? "#0f8a5f" : "#d9d9d9",
                  color: "#fff",
                  fontWeight: 700
                }}
              >
                {index + 1}
              </div>

              <strong>{step.label}</strong>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
            flexWrap: "wrap"
          }}
        >
          <button
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 600
            }}
          >
            Confirm Delivery
          </button>

          <button
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: "12px 20px",
              fontWeight: 600
            }}
          >
            Open Dispute
          </button>
        </div>
      </section>
    </main>
  );
}
