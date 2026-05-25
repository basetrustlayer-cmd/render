export type VerificationProjectionState =
  | "FRESH"
  | "STALE"
  | "EXPIRED"
  | "MISSING";

type ProjectionUser = {
  verificationLastSyncedAt: Date | string | null;
  verificationProjectionExpiresAt: Date | string | null;
};

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

function toMillis(value: Date | string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value.getTime()
      : Date.parse(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function isVerificationProjectionExpired(
  user: ProjectionUser
): boolean {
  const expiresAt = toMillis(
    user.verificationProjectionExpiresAt
  );

  if (!expiresAt) {
    return true;
  }

  return Date.now() >= expiresAt;
}

export function isVerificationProjectionFresh(
  user: ProjectionUser
): boolean {
  if (isVerificationProjectionExpired(user)) {
    return false;
  }

  const syncedAt = toMillis(
    user.verificationLastSyncedAt
  );

  if (!syncedAt) {
    return false;
  }

  return Date.now() - syncedAt <= STALE_AFTER_MS;
}

export function getVerificationProjectionState(
  user: ProjectionUser
): VerificationProjectionState {
  const syncedAt = toMillis(
    user.verificationLastSyncedAt
  );

  if (!syncedAt) {
    return "MISSING";
  }

  if (isVerificationProjectionExpired(user)) {
    return "EXPIRED";
  }

  if (!isVerificationProjectionFresh(user)) {
    return "STALE";
  }

  return "FRESH";
}
