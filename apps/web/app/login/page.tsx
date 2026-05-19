export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px", display: "grid", placeItems: "center" }}>
      <section
        style={{
          width: "100%",
          maxWidth: "460px",
          border: "1px solid var(--border)",
          borderRadius: "28px",
          padding: "32px",
          background: "#fff"
        }}
      >
        <p style={{ color: "var(--gold)", fontWeight: 700 }}>Render Login</p>
        <h1 style={{ fontSize: "36px", margin: "12px 0" }}>Verify your phone.</h1>
        <p style={{ opacity: 0.72, lineHeight: 1.7 }}>
          Enter your Ghana phone number to receive an OTP and unlock messaging,
          saved listings, and verified marketplace actions.
        </p>

        <label style={{ display: "grid", gap: "8px", marginTop: "24px", fontWeight: 700 }}>
          Phone number
          <input
            placeholder="+233501234567"
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              fontSize: "16px"
            }}
          />
        </label>

        <button
          type="button"
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            border: "none",
            background: "var(--ink)",
            color: "#fff",
            fontWeight: 800,
            fontSize: "16px"
          }}
        >
          Send OTP
        </button>
      </section>
    </main>
  );
}
