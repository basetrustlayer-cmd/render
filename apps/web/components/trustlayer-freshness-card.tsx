type TrustLayerFreshnessCardProps = {
  lastSyncedAt?: string | null;
  status?: string | null;
};

function formatSyncedAt(value?: string | null) {
  if (!value) return "TrustLayer sync pending";

  return `Last synced ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}`;
}

function freshnessState(value?: string | null) {
  if (!value) return "PENDING";

  const ageMs = Date.now() - new Date(value).getTime();
  const staleAfterMs = 2 * 24 * 60 * 60 * 1000;

  return ageMs > staleAfterMs ? "STALE" : "FRESH";
}

export function TrustLayerFreshnessCard({
  lastSyncedAt,
  status
}: TrustLayerFreshnessCardProps) {
  const state = freshnessState(lastSyncedAt);
  const isStale = state === "STALE";
  const isPending = state === "PENDING";

  return (
    <div
      className={`rounded-2xl border p-4 text-sm ${
        isStale
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : isPending
            ? "border-gray-200 bg-gray-50 text-gray-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      <p className="font-black">TrustLayer projection freshness: {state}</p>
      <p className="mt-1">{formatSyncedAt(lastSyncedAt)}</p>
      <p className="mt-1 text-xs opacity-80">
        Status source: {status ?? "Pending TrustLayer projection"}
      </p>
    </div>
  );
}
