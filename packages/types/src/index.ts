export type TrustTier = "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED";

export type VerificationLevel = 0 | 1 | 2 | 3;

export type TrustScoreSnapshot = {
  userId: string;
  score: number;
  tier: TrustTier;
  updatedAt: string;
};
