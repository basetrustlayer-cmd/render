import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyTrustLayerWebhookSignature } from "../webhooks.js";

describe("verifyTrustLayerWebhookSignature", () => {
  it("accepts a valid HMAC signature", () => {
    const rawBody = JSON.stringify({ event: "escrow.funded", id: "evt_1" });
    const secret = "test_secret";

    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    expect(
      verifyTrustLayerWebhookSignature({
        rawBody,
        signature,
        secret
      })
    ).toBe(true);
  });

  it("rejects an invalid HMAC signature", () => {
    expect(
      verifyTrustLayerWebhookSignature({
        rawBody: JSON.stringify({ event: "escrow.funded", id: "evt_1" }),
        signature: "bad_signature",
        secret: "test_secret"
      })
    ).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(
      verifyTrustLayerWebhookSignature({
        rawBody: "{}",
        signature: undefined,
        secret: "test_secret"
      })
    ).toBe(false);
  });
});
