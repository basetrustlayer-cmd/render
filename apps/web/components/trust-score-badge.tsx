type TrustScoreBadgeProps = {
  score: number;
  tier: string;
};

export function TrustScoreBadge({ score, tier }: TrustScoreBadgeProps) {
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
