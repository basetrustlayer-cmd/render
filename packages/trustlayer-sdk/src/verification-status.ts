export const TRUSTLAYER_VERIFICATION_STATUS = {
  IDENTITY_VERIFIED: "identity_verified",
  BUSINESS_VERIFIED: "business_verified",
  PENDING: "pending",
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review",
  UNVERIFIED: "unverified",
} as const;

export type TrustLayerVerificationStatus =
  (typeof TRUSTLAYER_VERIFICATION_STATUS)[keyof typeof TRUSTLAYER_VERIFICATION_STATUS];

const VERIFIED_STATUSES = new Set<TrustLayerVerificationStatus>([
  TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
  TRUSTLAYER_VERIFICATION_STATUS.BUSINESS_VERIFIED,
]);

const STATUS_ALIASES: Record<string, TrustLayerVerificationStatus> = {
  verified: TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
  identity_verified: TRUSTLAYER_VERIFICATION_STATUS.IDENTITY_VERIFIED,
  business_verified: TRUSTLAYER_VERIFICATION_STATUS.BUSINESS_VERIFIED,
  pending: TRUSTLAYER_VERIFICATION_STATUS.PENDING,
  rejected: TRUSTLAYER_VERIFICATION_STATUS.REJECTED,
  under_review: TRUSTLAYER_VERIFICATION_STATUS.UNDER_REVIEW,
  unverified: TRUSTLAYER_VERIFICATION_STATUS.UNVERIFIED,
};

export function normalizeVerificationStatus(
  value: string | null | undefined,
): TrustLayerVerificationStatus {
  if (!value) return TRUSTLAYER_VERIFICATION_STATUS.UNVERIFIED;

  const normalized = value.trim().toLowerCase();

  return STATUS_ALIASES[normalized] ?? TRUSTLAYER_VERIFICATION_STATUS.UNVERIFIED;
}

export function isVerifiedStatus(value: string | null | undefined): boolean {
  return VERIFIED_STATUSES.has(normalizeVerificationStatus(value));
}

export function getVerifiedVerificationStatuses(): TrustLayerVerificationStatus[] {
  return Array.from(VERIFIED_STATUSES);
}
