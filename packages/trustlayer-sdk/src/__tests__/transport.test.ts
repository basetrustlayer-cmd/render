import { afterEach, describe, expect, it, vi } from "vitest";
import { TrustLayerSdkError } from "../errors.js";
import { trustLayerRequest } from "../transport.js";

const config = {
  baseUrl: "https://api.trustlayer.test",
  apiKey: "test_api_key",
  maxRetries: 0,
  timeoutMs: 1000
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("trustLayerRequest", () => {
  it("sends auth, correlation, and idempotency headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    vi.stubGlobal("fetch", fetchMock);

    await trustLayerRequest(
      config,
      "/test",
      {
        method: "POST",
        body: JSON.stringify({ hello: "world" })
      },
      {
        correlationId: "corr_123",
        idempotencyKey: "idem_123"
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0];

    expect(init.headers.Authorization).toBe("Bearer test_api_key");
    expect(init.headers["X-Correlation-ID"]).toBe("corr_123");
    expect(init.headers["Idempotency-Key"]).toBe("idem_123");
  });

  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: "ok" }), { status: 200 })
      )
    );

    await expect(trustLayerRequest(config, "/test")).resolves.toEqual({ result: "ok" });
  });

  it("throws TrustLayerSdkError on non-retryable failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "bad" }), { status: 400 })
      )
    );

    await expect(trustLayerRequest(config, "/test")).rejects.toBeInstanceOf(TrustLayerSdkError);
  });

  it("retries retryable responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "busy" }), { status: 503 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      trustLayerRequest(
        {
          ...config,
          maxRetries: 1
        },
        "/test"
      )
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
