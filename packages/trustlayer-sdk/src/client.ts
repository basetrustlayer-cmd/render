import { createCorrelationId } from "./tracing.js";
import { createIdempotencyKey } from "./idempotency.js";
import { trustLayerRequest } from "./transport.js";
import type {
  TrustLayerClientConfig,
  TrustLayerIdentityVerificationRequest,
  TrustLayerIdentityVerificationResponse,
  TrustLayerListingRiskAssessmentRequest,
  TrustLayerListingRiskAssessmentResponse,
  TrustLayerRequestOptions,
  TrustLayerSafeDealConfirmResponse,
  TrustLayerSafeDealIntentRequest,
  TrustLayerSafeDealIntentResponse,
  TrustLayerTrustScoreResponse,  TrustLayerDisputeResolutionRequest,
  TrustLayerDisputeResolutionResponse
} from "./types.js";

export class TrustLayerClient {
  constructor(private readonly config: TrustLayerClientConfig) {}

  async verifyGhanaCard(
    input: TrustLayerIdentityVerificationRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerIdentityVerificationResponse> {
    return trustLayerRequest<TrustLayerIdentityVerificationResponse>(
      this.config,
      "/identity/ghana-card/verify",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("identity"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("identity_verify"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async getTrustScore(
    userId: string,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerTrustScoreResponse> {
    return trustLayerRequest<TrustLayerTrustScoreResponse>(
      this.config,
      `/trustscore/${encodeURIComponent(userId)}`,
      {
        method: "GET"
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("trustscore"),
        timeoutMs: options.timeoutMs
      }
    );
  }


  async assessListingRisk(
    input: TrustLayerListingRiskAssessmentRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerListingRiskAssessmentResponse> {
    return trustLayerRequest<TrustLayerListingRiskAssessmentResponse>(
      this.config,
      "/risk/listings/assess",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("listing_risk"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("listing_risk"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async createSafeDealIntent(
    input: TrustLayerSafeDealIntentRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerSafeDealIntentResponse> {
    return trustLayerRequest<TrustLayerSafeDealIntentResponse>(
      this.config,
      "/safedeals/intents",
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("safedeal"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("safedeal_intent"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async confirmSafeDeal(
    escrowId: string,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerSafeDealConfirmResponse> {
    return trustLayerRequest<TrustLayerSafeDealConfirmResponse>(
      this.config,
      `/safedeals/${encodeURIComponent(escrowId)}/confirm`,
      {
        method: "POST"
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("safedeal_confirm"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("safedeal_confirm"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async openSafeDealDispute(
    escrowId: string,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerSafeDealConfirmResponse> {
    return trustLayerRequest<TrustLayerSafeDealConfirmResponse>(
      this.config,
      `/safedeals/${encodeURIComponent(escrowId)}/dispute`,
      {
        method: "POST"
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("safedeal_dispute"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("safedeal_dispute"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async resolveDisputeBuyerRefund(
    input: TrustLayerDisputeResolutionRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerDisputeResolutionResponse> {
    return trustLayerRequest<TrustLayerDisputeResolutionResponse>(
      this.config,
      `/safedeals/${encodeURIComponent(input.escrowId)}/disputes/${encodeURIComponent(input.disputeId)}/resolve/buyer-refund`,
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("dispute_refund"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("dispute_refund"),
        timeoutMs: options.timeoutMs
      }
    );
  }

  async resolveDisputeSellerRelease(
    input: TrustLayerDisputeResolutionRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerDisputeResolutionResponse> {
    return trustLayerRequest<TrustLayerDisputeResolutionResponse>(
      this.config,
      `/safedeals/${encodeURIComponent(input.escrowId)}/disputes/${encodeURIComponent(input.disputeId)}/resolve/seller-release`,
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("dispute_release"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("dispute_release"),
        timeoutMs: options.timeoutMs
      }
    );
  }

}

export function createTrustLayerClient(config: TrustLayerClientConfig): TrustLayerClient {
  return new TrustLayerClient(config);
}
