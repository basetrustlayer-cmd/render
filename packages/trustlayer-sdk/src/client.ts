import { createCorrelationId } from "./tracing.js";
import { createIdempotencyKey } from "./idempotency.js";
import { trustLayerRequest } from "./transport.js";
import type {
  TrustLayerClientConfig,
  TrustLayerIdentityVerificationRequest,
  TrustLayerIdentityVerificationResponse,
  TrustLayerRequestOptions,
  TrustLayerSafeDealConfirmResponse,
  TrustLayerSafeDealIntentRequest,
  TrustLayerSafeDealIntentResponse,
  TrustLayerTrustScoreResponse,
  TrustLayerSettlementReleaseRequest,
  TrustLayerSettlementReleaseResponse
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

  async releaseSettlement(
    input: TrustLayerSettlementReleaseRequest,
    options: TrustLayerRequestOptions = {}
  ): Promise<TrustLayerSettlementReleaseResponse> {
    return trustLayerRequest<TrustLayerSettlementReleaseResponse>(
      this.config,
      `/safedeals/${encodeURIComponent(input.escrowId)}/settlement-release`,
      {
        method: "POST",
        body: JSON.stringify(input)
      },
      {
        correlationId: options.correlationId ?? createCorrelationId("settlement_release"),
        idempotencyKey: options.idempotencyKey ?? createIdempotencyKey("settlement_release"),
        timeoutMs: options.timeoutMs
      }
    );
  }
}

export function createTrustLayerClient(config: TrustLayerClientConfig): TrustLayerClient {
  return new TrustLayerClient(config);
}
