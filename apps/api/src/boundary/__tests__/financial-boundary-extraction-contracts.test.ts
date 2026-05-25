import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Render financial boundary extraction contracts", () => {
  const safeDealsRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");
  const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");
  const adminRoutes = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("prevents Render from owning financial authority execution", () => {
    const renderOwnedSources = [safeDealsRoutes, adminRoutes];

    const forbiddenAuthorityPatterns = [
      "executePayout(",
      "paySeller(",
      "releaseEscrow(",
      "settleFunds(",
      "refundBuyer(",
      "reconcileSettlement(",
      "financialLedger",
      "paymentProcessorSecret",
      "settlementLedgerAuthority"
    ];

    for (const source of renderOwnedSources) {
      for (const pattern of forbiddenAuthorityPatterns) {
        expect(source).not.toContain(pattern);
      }
    }
  });

  it("keeps Render financial state as existing TrustLayer references or cached projections only", () => {
    expect(schema).toContain("trustLayerEscrowId");
    expect(schema).toContain("escrowStatusCached");
    expect(schema).toContain("escrowLastSyncedAt");

    expect(safeDealsRoutes).toContain("trustlayerUserId");
    expect(safeDealsRoutes).toContain("trustLayerEscrowId");
    expect(webhookRoutes).toContain("trustLayer");
  });

  it("prevents marketplace routes from self-assigning TrustLayer financial outcomes", () => {
    const forbiddenSelfAssignmentPatterns = [
      "trustLayerEscrowId: parsed.data",
      "settlementStatus: parsed.data",
      "paymentStatus: parsed.data",
      "disputeStatus: parsed.data",
      "escrowStatusCached: parsed.data"
    ];

    for (const pattern of forbiddenSelfAssignmentPatterns) {
      expect(safeDealsRoutes).not.toContain(pattern);
      expect(adminRoutes).not.toContain(pattern);
    }
  });

  it("keeps disputes and settlement decisions outside Render marketplace authority", () => {
    expect(adminRoutes).toContain("createTrustLayerClient");
    expect(adminRoutes).not.toContain("approvePayout");
    expect(adminRoutes).not.toContain("markSettlementComplete");
    expect(adminRoutes).not.toContain("forceReleaseFunds");
  });
});
