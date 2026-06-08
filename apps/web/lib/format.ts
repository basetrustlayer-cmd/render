/**
 * Formats a numeric price as GH₵ with thousands separator and 2 decimal places.
 * Handles string | number | null | undefined safely.
 *
 * Usage:
 *   formatGhs(5000)        → "GH₵ 5,000.00"
 *   formatGhs("12500.5")   → "GH₵ 12,500.50"
 *   formatGhs(null)        → "GH₵ 0.00"
 */
export function formatGhs(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `GH₵ ${safe.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Compact version — no decimals, for listing cards where space is tight.
 *   formatGhsCompact(5000)  → "GH₵ 5,000"
 *   formatGhsCompact(1250)  → "GH₵ 1,250"
 */
export function formatGhsCompact(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `GH₵ ${safe.toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
