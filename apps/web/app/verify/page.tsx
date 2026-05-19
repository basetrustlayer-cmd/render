const steps = [
  {
    title: "Phone Verification",
    level: "Level 1",
    description: "Unlock messaging, saved listings, and WhatsApp contact."
  },
  {
    title: "Ghana Card Verification",
    level: "Level 2",
    description: "Unlock listing creation and verified seller badge."
  },
  {
    title: "Business Verification",
    level: "Level 3",
    description: "Unlock business badge, unlimited listings, and Safe Deal eligibility."
  }
];

export default function VerifyPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section style={{ maxWidth: "920px", margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontWeight: 700 }}>TrustLayer Verification</p>
        <h1 style={{ fontSize: "48px", margin: "12px 0" }}>
          Build trust before you trade.
        </h1>
        <p style={{ fontSize: "18px", opacity: 0.72, lineHeight: 1.7 }}>
          Render uses TrustLayer to verify sellers and calculate reputation signals
          before marketplace transactions happen.
        </p>

        <div style={{ display: "grid", gap: "18px", marginTop: "32px" }}>
          {steps.map((step) => (
            <article
              key={step.level}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "24px",
                padding: "24px",
                background: "#fff"
              }}
            >
              <p style={{ margin: 0, color: "var(--green)", fontWeight: 800 }}>
                {step.level}
              </p>
              <h2 style={{ margin: "8px 0" }}>{step.title}</h2>
              <p style={{ opacity: 0.72, lineHeight: 1.7 }}>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
