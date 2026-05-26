import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal blocked command read model visibility contract", () => {
  it("keeps blocked stale command events visible through audit metadata", () => {
    expect(safeDealRoutes).toContain("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION");
    expect(safeDealRoutes).toContain('entityType: "SAFE_DEAL"');
    expect(safeDealRoutes).toContain("entityId: input.safeDeal.id");
    expect(safeDealRoutes).toContain("trustLayerEscrowId: input.safeDeal.trustLayerEscrowId");
  });

  it("exposes projection-scoped block context without adding persistence tables", () => {
    expect(safeDealRoutes).toContain('projection: "ESCROW"');
    expect(safeDealRoutes).toContain("freshness: input.freshness.state");
    expect(safeDealRoutes).not.toContain("blockedCommand");
    expect(safeDealRoutes).not.toContain("staleCommand");
  });

  it("keeps read-model visibility non-financial", () => {
    expect(safeDealRoutes).not.toContain("settlement");
    expect(safeDealRoutes).not.toContain("ledger");
  });
});
