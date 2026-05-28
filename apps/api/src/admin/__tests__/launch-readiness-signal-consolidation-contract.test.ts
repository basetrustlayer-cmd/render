import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness signal consolidation contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("consolidates operational SLO and TrustLayer sync signals into launch readiness", () => {
    expect(source).toContain("launchReadinessSignals");
    expect(source).toContain("launchReadinessSignal");
    expect(source).toContain("failedTrustLayerWebhooks");
    expect(source).toContain("pendingTrustLayerWebhooks");
    expect(source).toContain("staleWebhookEvents");
  });

  it("includes stale SafeDeal projection and command-block pressure", () => {
    expect(source).toContain("staleSafeDealProjections");
    expect(source).toContain("staleCommandBlocks");
    expect(source).toContain("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION");
    expect(source).toContain("prisma.safeDeal.count");
  });

  it("includes replay and dead-letter pressure without adding persistence tables", () => {
    expect(source).toContain("replayPressure");
    expect(source).toContain("deadLetterPressure");
    expect(source).toContain('sourceModels: ["auditLog", "webhookEvent", "safeDeal"]');
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
    expect(schema).not.toContain("model LaunchReadinessSignal");
  });

  it("preserves TrustLayer financial boundary", () => {
    expect(source).not.toContain("executePayout");
    expect(source).not.toContain("releaseEscrow");
    expect(source).not.toContain("settleLedger");
  });
});
