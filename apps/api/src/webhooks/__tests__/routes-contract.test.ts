import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("webhook route trust and idempotency contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

  it("keeps TrustLayer webhook configured for raw body signature verification", () => {
    expect(source).toContain('app.post("/webhooks/trustlayer", { config: { rawBody: true } }');
    expect(source).not.toContain("/webhooks/paystack");
    expect(source).not.toContain("verifyPaystackSignature");
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

  it("marks duplicate TrustLayer webhook events without replaying projections", () => {
    expect(source).toContain("isUniqueConstraintError");
    expect(source).toContain("WEBHOOK_TRUSTLAYER_DUPLICATE_IGNORED");
    expect(source).toContain('status: "DUPLICATE"');
    expect(source).toContain("duplicate: true");
    expect(source.indexOf('status: "DUPLICATE"')).toBeLessThan(source.indexOf("duplicate: true"));
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

  it("records webhook processing duration for processed and duplicate events", () => {
    expect(source).toContain("recordOperationalMetric");
    expect(source).toContain('name: "webhook.processing.duration_ms"');
    expect(source).toContain('status: "PROCESSED"');
    expect(source).toContain('status: "DUPLICATE"');
    expect(source).toContain("elapsedMs(webhookStartedAt)");
  });
  it("gates user and SafeDeal projection mutations by TrustLayer event type", () => {
    expect(source).toContain("isTrustLayerUserEvent");
    expect(source).toContain("isTrustLayerEscrowEvent");
    expect(source).toContain('event.startsWith("identity.") || event.startsWith("trust.")');
    expect(source).toContain('event.startsWith("escrow.") || event.startsWith("safedeal.")');
    expect(source).toContain("isTrustLayerUserEvent(parsed.data.event) && (userId || trustlayerUserId)");
    expect(source).toContain("isTrustLayerEscrowEvent(parsed.data.event) && escrowId");
  });

  it("prevents stale TrustLayer events from overwriting newer projections", () => {
    expect(source).toContain("OR: [{ trustLastSyncedAt: null }, { trustLastSyncedAt: { lte: eventTime } }]");
    expect(source).toContain("existing.escrowLastSyncedAt && existing.escrowLastSyncedAt > eventTime");
    expect(source).toContain("updatedCount: 0");
  });

  it("audits and records metrics when stale escrow events are ignored", () => {
    expect(source).toContain("WEBHOOK_TRUSTLAYER_STALE_ESCROW_EVENT_IGNORED");
    expect(source).toContain('status: "STALE_IGNORED"');
    expect(source).toContain('projection: "SAFE_DEAL"');
    expect(source).toContain("incomingSyncedAt: eventTime.toISOString()");
    expect(source).toContain("currentSyncedAt: existing.escrowLastSyncedAt.toISOString()");
  });

});
