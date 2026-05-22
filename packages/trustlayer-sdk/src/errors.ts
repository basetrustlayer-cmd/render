export class TrustLayerSdkError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TrustLayerSdkError";
  }
}

export class TrustLayerTimeoutError extends TrustLayerSdkError {
  constructor(message = "TrustLayer request timed out.") {
    super(message, 408, "TRUSTLAYER_TIMEOUT");
    this.name = "TrustLayerTimeoutError";
  }
}

export class TrustLayerCircuitOpenError extends TrustLayerSdkError {
  constructor() {
    super("TrustLayer circuit breaker is open.", 503, "TRUSTLAYER_CIRCUIT_OPEN");
    this.name = "TrustLayerCircuitOpenError";
  }
}
