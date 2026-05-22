export type TrustLayerClientConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
};

export type TrustLayerRequestOptions = {
  correlationId?: string;
  idempotencyKey?: string;
  timeoutMs?: number;
};

export type TrustLayerIdentityVerificationRequest = {
  userId: string;
  ghanaCardNumber: string;
  fullName?: string;
  dateOfBirth?: string;
};

export type TrustLayerIdentityVerificationResponse = {
  verificationId: string;
  status: "pending" | "verified" | "rejected" | "manual_review";
  verificationLevel: number;
  trustScore?: number;
  trustTier?: "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED";
};

export type TrustLayerSafeDealIntentRequest = {
  buyerTlId: string;
  sellerTlId: string;
  listingId: string;
  amountGhs: number;
  metadata?: Record<string, unknown>;
};

export type TrustLayerSafeDealIntentResponse = {
  escrowId: string;
  paymentUrl: string;
  status: string;
  amountGhs: number;
  expiresAt?: string;
};

export type TrustLayerSafeDealConfirmResponse = {
  escrowId: string;
  status: string;
};

export type TrustLayerTrustScoreResponse = {
  userId: string;
  trustScore: number;
  trustTier: "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED";
  badge?: string;
  lastUpdatedAt: string;
};
