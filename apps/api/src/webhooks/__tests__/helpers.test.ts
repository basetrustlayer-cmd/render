import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  deriveTrustLayerEventId,
  isUniqueConstraintError,
  mapTrustLayerEscrowStatus,
  verifyHmac
} from "../helpers.js";

describe("webhook helpers", () => {
  it("verifies valid TrustLayer HMAC signatures", () => {
    const payload = JSON.stringify({ event: "escrow.updated" });
    const secret = "test-secret";
    const signature = crypto
      .createHmac("sha512", secret)
      .update(payload)
      .digest("hex");

    expect(
      verifyHmac({
        payload,
        signature,
        secret
      })
    ).toBe(true);
  });

  it("rejects missing or invalid HMAC signatures", () => {
    expect(
      verifyHmac({
        payload: "{}",
        signature: undefined,
        secret: "test-secret"
      })
    ).toBe(false);

    expect(
      verifyHmac({
        payload: "{}",
        signature: "bad-signature",
        secret: "test-secret"
      })
    ).toBe(false);
  });

  it("prefers explicit TrustLayer eventId over id and raw body hash", () => {
    expect(
      deriveTrustLayerEventId({
        explicitEventId: "event-explicit",
        id: "event-id",
        rawBody: "{}"
      })
    ).toBe("event-explicit");
  });

  it("falls back to TrustLayer id when eventId is absent", () => {
    expect(
      deriveTrustLayerEventId({
        id: "event-id",
        rawBody: "{}"
      })
    ).toBe("event-id");
  });

  it("derives deterministic event id from raw body when no provider id exists", () => {
    const rawBody = JSON.stringify({ event: "escrow.updated", data: { escrowId: "escrow-1" } });
    const expected = crypto.createHash("sha256").update(rawBody).digest("hex");

    expect(
      deriveTrustLayerEventId({
        rawBody
      })
    ).toBe(expected);
  });

  it("detects Prisma unique constraint errors for duplicate webhook replay handling", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true);
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false);
  });

  it("maps only supported TrustLayer escrow statuses", () => {
    expect(mapTrustLayerEscrowStatus("FUNDED")).toBe("FUNDED");
    expect(mapTrustLayerEscrowStatus("DELIVERED")).toBe("DELIVERED");
    expect(mapTrustLayerEscrowStatus("DISPUTED")).toBe("DISPUTED");
    expect(mapTrustLayerEscrowStatus("CONFIRMED")).toBe("CONFIRMED");
    expect(mapTrustLayerEscrowStatus("COMPLETE")).toBe("COMPLETE");
    expect(mapTrustLayerEscrowStatus("REFUNDED")).toBe("REFUNDED");
    expect(mapTrustLayerEscrowStatus("UNKNOWN")).toBeUndefined();
    expect(mapTrustLayerEscrowStatus(undefined)).toBeUndefined();
  });
});
