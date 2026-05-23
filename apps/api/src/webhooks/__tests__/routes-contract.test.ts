import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("webhook route trust and idempotency contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

  it("keeps both webhook endpoints configured for raw body signature verification", () => {
    expect(source).toContain('app.post("/webhooks/paystack", { config: { rawBody: true } }');
    expect(source).toContain('app.post("/webhooks/trustlayer", { config: { rawBody: true } }');
  });

  it("requires Paystack signature validation and treats Paystack as transitional noop", () => {
    expect(source).toContain("verifyPaystackSignature");
    expect(source).toContain("PAYSTACK_SECRET_KEY");
    expect(source).toContain("WEBHOOK_PAYSTACK_INVALID_SIGNATURE");
    expect(source).toContain("WEBHOOK_PAYSTACK_RECEIVED_TRANSITIONAL_NOOP");
    expect(source).toContain("PAYSTACK_EVENTS_OWNED_BY_TRUSTLAYER");
    expect(source).toContain("updatedSafeDeals: 0");
  });

  it("requires TrustLayer HMAC validation before processing", () => {
    expect(source).toContain("verifyHmac");
    expect(source).toContain("TRUSTLAYER_WEBHOOK_SECRET");
    expect(source).toContain("WEBHOOK_TRUSTLAYER_INVALID_SIGNATURE");
    expect(source.indexOf("verifyHmac")).toBeLessThan(source.indexOf("trustLayerWebhookSchema.safeParse"));
  });

  it("derives and stores provider event id before state mutation", () => {
    expect(source).toContain("deriveTrustLayerEventId");
    expect(source).toContain("prisma.webhookEvent.create");
    expect(source).toContain('provider: "TRUSTLAYER"');
    expect(source).toContain('status: "RECEIVED"');
    expect(source.indexOf("prisma.webhookEvent.create")).toBeLessThan(source.indexOf("prisma.user.updateMany"));
  });

  it("ignores duplicate TrustLayer webhook events idempotently", () => {
    expect(source).toContain("isUniqueConstraintError");
    expect(source).toContain("WEBHOOK_TRUSTLAYER_DUPLICATE_IGNORED");
    expect(source).toContain("duplicate: true");
  });

  it("keeps TrustLayer webhook as the SafeDeal projection update path", () => {
    expect(source).toContain("mapTrustLayerEscrowStatus");
    expect(source).toContain("trustLayerEscrowId: escrowId");
    expect(source).toContain("escrowStatusCached: escrowStatus");
    expect(source).toContain("escrowLastSyncedAt: eventTime");
  });

  it("creates settlement ledger only on first confirmed webhook transition", () => {
    expect(source).toContain('const wasAlreadyConfirmed = existing.status === "CONFIRMED"');
    expect(source).toContain('mappedStatus !== "CONFIRMED" || wasAlreadyConfirmed');
    expect(source).toContain("createSettlementLedgerForConfirmedDeal");
    expect(source).toContain("SETTLEMENT_READY_FROM_TRUSTLAYER_WEBHOOK");
  });

  it("marks processed webhook events after successful projection", () => {
    expect(source).toContain("prisma.webhookEvent.update");
    expect(source).toContain('status: "PROCESSED"');
    expect(source).toContain("processedAt: new Date()");
  });
});
