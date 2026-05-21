"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth";

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

type GhanaCardVerifyResponse = {
  verification: {
    provider: string;
    status: "VERIFIED" | "REJECTED" | "PENDING";
    reference?: string;
    user?: {
      id: string;
      verificationLevel: number;
      trustScore: number | null;
      trustTier: string | null;
    };
  };
};

export default function VerifyPage() {
  const router = useRouter();
  const hydrate = useAuthStore((state) => state.hydrate);
  const logout = useAuthStore((state) => state.logout);
  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GhanaCardVerifyResponse["verification"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleInvalidAuth() {
      logout();
      router.replace("/login");
    }

    window.addEventListener("render-auth-invalid", handleInvalidAuth);

    return () => {
      window.removeEventListener("render-auth-invalid", handleInvalidAuth);
    };
  }, [logout, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiFetch<GhanaCardVerifyResponse>("/verify/ghana-card", {
        method: "POST",
        body: JSON.stringify({ ghanaCardNumber })
      });

      setResult(response.verification);
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
        logout();
        router.replace("/login");
        return;
      }

      setError(err instanceof Error ? err.message : "Unable to verify Ghana Card.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section style={{ maxWidth: "920px", margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontWeight: 700 }}>TrustLayer Verification</p>
        <h1 style={{ fontSize: "48px", margin: "12px 0" }}>
          Build trust before you trade.
        </h1>
        <p style={{ fontSize: "18px", opacity: 0.72, lineHeight: 1.7 }}>
          Render uses TrustLayer to verify sellers and calculate reputation signals before marketplace transactions happen.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "28px",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "24px",
            background: "#fff"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Verify Ghana Card</h2>
          <p style={{ opacity: 0.72, lineHeight: 1.7 }}>
            Enter your Ghana Card number. Verification is routed through TrustLayer.
          </p>

          <input
            required
            value={ghanaCardNumber}
            onChange={(event) => setGhanaCardNumber(event.target.value)}
            placeholder="GHA-000000000-0"
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "14px 16px",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              fontSize: "16px"
            }}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "16px",
              border: "0",
              borderRadius: "14px",
              padding: "14px 18px",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? "Verifying..." : "Verify with TrustLayer"}
          </button>

          {error && (
            <div style={{ marginTop: "16px", color: "#b91c1c", lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: "16px", color: "#047857", lineHeight: 1.6 }}>
              TrustLayer status: <strong>{result.status}</strong>
              {result.reference ? ` · Reference: ${result.reference}` : ""}
            </div>
          )}
        </form>

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
