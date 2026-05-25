export type SafeDealProjectionState = "MISSING" | "EXPIRED" | "STALE" | "FRESH";

const SAFE_DEAL_PROJECTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SAFE_DEAL_PROJECTION_STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

type ProjectionInput = {
  lastSyncedAt: Date | string | null | undefined;
  now?: Date;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function getSafeDealProjectionFreshness(input: ProjectionInput): {
  state: SafeDealProjectionState;
  expiresAt: Date | null;
} {
  const now = input.now ?? new Date();
  const lastSyncedAt = toDate(input.lastSyncedAt);

  if (!lastSyncedAt) {
    return { state: "MISSING", expiresAt: null };
  }

  const expiresAt = new Date(lastSyncedAt.getTime() + SAFE_DEAL_PROJECTION_TTL_MS);

  if (expiresAt <= now) {
    return { state: "EXPIRED", expiresAt };
  }

  const staleAt = new Date(lastSyncedAt.getTime() + SAFE_DEAL_PROJECTION_STALE_AFTER_MS);

  if (staleAt <= now) {
    return { state: "STALE", expiresAt };
  }

  return { state: "FRESH", expiresAt };
}
