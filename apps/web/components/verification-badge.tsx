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
      return {
        label: "TrustLayer verified",
        help: "TrustLayer verification status is verified."
      };
    case "PENDING":
    case "VERIFICATION_PENDING":
      return {
        label: "Verification pending",
        help: "TrustLayer verification is still pending."
      };
    case "REJECTED":
      return {
        label: "Verification rejected",
        help: "TrustLayer did not approve this verification."
      };
    case "STALE":
      return {
        label: "Trust data stale",
        help: "TrustLayer data may need a fresh sync."
      };
    case "SYNCING":
      return {
        label: "Trust syncing",
        help: "TrustLayer verification data is syncing."
      };
    case "UNKNOWN":
    case "UNAVAILABLE":
      return {
        label: "Verification unavailable",
        help: "TrustLayer verification projection is unavailable or not yet synced."
      };
    default:
      return {
        label: normalized.replace(/_/g, " ").toLowerCase(),
        help: `TrustLayer verification status: ${normalized}.`
      };
  }
}

export function VerificationBadge({ status, compact = false }: VerificationBadgeProps) {
  const normalized = normalizeStatus(status);
  const copy = badgeCopy(status);

  const tone =
    normalized === "VERIFIED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : normalized === "REJECTED"
        ? "border-red-200 bg-red-50 text-red-700"
        : normalized === "STALE"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : normalized === "SYNCING"
            ? "border-blue-200 bg-blue-50 text-blue-800"
            : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span
      title={copy.help}
      className={`inline-flex items-center rounded-full border font-bold ${tone} ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      {copy.label}
    </span>
  );
}
