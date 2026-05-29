type TrustScoreBadgeProps = {
  score: number | null;
  tier: string | null;
};

export function TrustScoreBadge({ score, tier }: TrustScoreBadgeProps) {
  const displayTier = tier ?? "UNSCORED";
  const displayScore = score === null ? "No score" : `${score}`;

  const color =
    displayTier === "TRUSTED"
      ? "var(--green)"
      : displayTier === "VERIFIED"
        ? "var(--blue)"
        : displayTier === "BUILDING"
          ? "var(--gold)"
          : "#8A837A";

  return (
    <span
      title={
        score === null || tier === null
          ? "TrustLayer score projection unavailable or not yet synced"
          : "TrustLayer trust score"
      }
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
      {displayScore} · {displayTier}
    </span>
  );
}
