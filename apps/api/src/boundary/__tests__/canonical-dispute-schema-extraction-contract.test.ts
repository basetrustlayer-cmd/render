import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

const disputeModel = schema.slice(
  schema.indexOf("model Dispute {"),
  schema.indexOf("model DisputeEvent {")
);

const disputeStatusEnum = schema.slice(
  schema.indexOf("enum DisputeStatus {"),
  schema.indexOf("enum DisputeEventType {")
);

describe("canonical dispute schema extraction contract", () => {
  it("removes legacy Render financial resolution fields from Dispute", () => {
    expect(disputeModel).not.toContain("resolution");
    expect(disputeModel).not.toContain("resolvedAt");
    expect(disputeModel).not.toContain("resolved_at");
  });

  it("keeps Dispute as TrustLayer projection-aware without financial execution authority", () => {
    expect(disputeModel).toContain("trustLayerDisputeId");
    expect(disputeModel).toContain("disputeStatusCached");
    expect(disputeModel).toContain("disputeReasonCached");
    expect(disputeModel).toContain("disputeLastSyncedAt");
  });

  it("limits Render dispute workflow enum to active moderator workflow states only", () => {
    expect(disputeStatusEnum).toContain("OPEN");
    expect(disputeStatusEnum).toContain("UNDER_REVIEW");
    expect(disputeStatusEnum).toContain("NEEDS_BUYER_RESPONSE");
    expect(disputeStatusEnum).toContain("NEEDS_SELLER_RESPONSE");
    expect(disputeStatusEnum).not.toContain("RESOLVED_BUYER_REFUND");
    expect(disputeStatusEnum).not.toContain("RESOLVED_SELLER_RELEASE");
    expect(disputeStatusEnum).not.toContain("CANCELLED");
  });
});
