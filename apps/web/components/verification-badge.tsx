type VerificationBadgeProps = {
  status?: string | null;
  compact?: boolean;
};

function normalizeStatus(status?: string | null) {
  return (status ?? "UNKNOWN").toUpperCase().replace(/\s+/g, "_");
}

function badgeCopy(status?: string | null) {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "VERIFIED":
    case "APPROVED":
    case "ACTIVE":
      return {
        label: "Verified by TrustLayer",
        help: "TrustLayer verification projection is verified."
      };
    case "PENDING":
    case "VERIFICATION_PENDING":
    case "SYNCING":
      return {
        label: "TrustLayer sync pending",
        help: "Render is waiting for the latest TrustLayer verification projection."
      };
    case "MANUAL_REVIEW":
    case "NEEDS_REVIEW":
    case "UNDER_REVIEW":
      return {
        label: "TrustLayer review needed",
        help: "TrustLayer verification projection indicates review is needed."
      };
    case "REJECTED":
    case "NOT_VERIFIED":
    case "FAILED":
      return {
        label: "Not verified",
        help: "TrustLayer verification projection is not verified."
      };
    case "SUSPENDED":
    case "BLOCKED":
      return {
        label: "Trust status blocked",
        help: "TrustLayer or marketplace controls indicate this account is blocked or suspended."
      };
    case "STALE":
      return {
        label: "TrustLayer data stale",
        help: "TrustLayer verification projection may need a fresh sync."
      };
    case "UNKNOWN":
    case "UNAVAILABLE":
      return {
        label: "TrustLayer status unavailable",
        help: "TrustLayer verification projection is unavailable or not yet synced."
      };
    default:
      return {
        label: `TrustLayer: ${normalized.replace(/_/g, " ").toLowerCase()}`,
        help: `Render is displaying TrustLayer verification projection: ${normalized}.`
      };
  }
}

function badgeTone(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (["VERIFIED", "APPROVED", "ACTIVE"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (["REJECTED", "NOT_VERIFIED", "FAILED", "SUSPENDED", "BLOCKED"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (["STALE", "MANUAL_REVIEW", "NEEDS_REVIEW", "UNDER_REVIEW"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (["PENDING", "VERIFICATION_PENDING", "SYNCING"].includes(normalized)) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

export function VerificationBadge({ status, compact = false }: VerificationBadgeProps) {
  const copy = badgeCopy(status);

  return (
    <span
      title={copy.help}
      className={`inline-flex items-center rounded-full border font-bold ${badgeTone(status)} ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      {copy.label}
    </span>
  );
}
