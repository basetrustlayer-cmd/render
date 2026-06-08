type TrustScoreBadgeProps = {
  score: number | null;
  tier: string | null;
  verificationStatus?: string | null;
};

const UNVERIFIED_STATUSES = new Set([
  "UNAVAILABLE",
  "UNKNOWN",
  "PENDING",
  "VERIFICATION_PENDING",
  "SYNCING",
  "NOT_VERIFIED",
  "FAILED",
  "REJECTED",
  "SUSPENDED",
  "BLOCKED",
  "STALE",
]);

export function TrustScoreBadge({ score, tier, verificationStatus }: TrustScoreBadgeProps) {
  // Don't show a score when verification status signals the data isn't trustworthy
  const statusNormalized = (verificationStatus ?? "UNKNOWN").toUpperCase().replace(/\s+/g, "_");
  if (score === null || tier === null || UNVERIFIED_STATUSES.has(statusNormalized)) {
    return null;
  }

  const color =
    tier === "TRUSTED"
      ? "var(--green)"
      : tier === "VERIFIED"
        ? "var(--blue)"
        : tier === "BUILDING"
          ? "var(--gold)"
          : "#8A837A";

  return (
    <span
      title="TrustLayer trust score"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        padding: "6px 10px",
        fontSize: "13px",
        fontWeight: 700,
        background: "#fff"
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          background: color
        }}
      />
      {score} · {tier}
    </span>
  );
}
