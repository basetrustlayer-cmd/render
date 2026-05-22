import { TrustLayerCircuitOpenError, TrustLayerSdkError, TrustLayerTimeoutError } from "./errors.js";
import { calculateRetryDelayMs, shouldRetry, sleep } from "./retry.js";
import { buildAuthHeaders } from "./auth.js";
import type { TrustLayerClientConfig, TrustLayerRequestOptions } from "./types.js";

type CircuitState = {
  failureCount: number;
  openedUntil: number | null;
};

const circuitState: CircuitState = {
  failureCount: 0,
  openedUntil: null
};

export async function trustLayerRequest<TResponse>(
  config: TrustLayerClientConfig,
  path: string,
  init: RequestInit = {},
  options: TrustLayerRequestOptions = {}
): Promise<TResponse> {
  const now = Date.now();

  if (circuitState.openedUntil && circuitState.openedUntil > now) {
    throw new TrustLayerCircuitOpenError();
  }

  const maxRetries = config.maxRetries ?? 3;
  const timeoutMs = options.timeoutMs ?? config.timeoutMs ?? 10_000;
  const url = new URL(path, config.baseUrl).toString();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(config.apiKey),
          ...(options.correlationId ? { "X-Correlation-ID": options.correlationId } : {}),
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
          ...(init.headers ?? {})
        }
      });

      clearTimeout(timeout);

      const responseBody = await response.text();
      const parsedBody = responseBody ? JSON.parse(responseBody) as unknown : null;

      if (!response.ok) {
        circuitState.failureCount += 1;

        if (circuitState.failureCount >= 5) {
          circuitState.openedUntil = Date.now() + 60_000;
        }

        if (attempt < maxRetries && shouldRetry(response.status)) {
          await sleep(calculateRetryDelayMs(attempt));
          continue;
        }

        throw new TrustLayerSdkError(
          "TrustLayer request failed.",
          response.status,
          "TRUSTLAYER_REQUEST_FAILED",
          parsedBody
        );
      }

      circuitState.failureCount = 0;
      circuitState.openedUntil = null;

      return parsedBody as TResponse;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof TrustLayerSdkError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        if (attempt < maxRetries) {
          await sleep(calculateRetryDelayMs(attempt));
          continue;
        }

        throw new TrustLayerTimeoutError();
      }

      circuitState.failureCount += 1;

      if (circuitState.failureCount >= 5) {
        circuitState.openedUntil = Date.now() + 60_000;
      }

      if (attempt < maxRetries) {
        await sleep(calculateRetryDelayMs(attempt));
        continue;
      }

      throw new TrustLayerSdkError(
        error instanceof Error ? error.message : "Unknown TrustLayer SDK error.",
        500,
        "TRUSTLAYER_UNKNOWN_ERROR",
        error
      );
    }
  }

  throw new TrustLayerSdkError("TrustLayer request failed after retries.");
}
