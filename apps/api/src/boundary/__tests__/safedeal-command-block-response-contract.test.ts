import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal command block response contract", () => {
  it("returns explicit conflict responses for stale escrow projection blocks", () => {
    expect(safeDealRoutes).toContain("return reply.code(409).send({");
    expect(safeDealRoutes).toContain("error: escrowFreshness.error");
    expect(safeDealRoutes).toContain('projection: "ESCROW"');
    expect(safeDealRoutes).toContain("freshness: escrowFreshness.state");
  });

  it("uses the same blocked response shape for confirm and dispute commands", () => {
    expect(safeDealRoutes.match(/error: escrowFreshness\.error/g)?.length).toBeGreaterThanOrEqual(2);
    expect(safeDealRoutes.match(/projection: "ESCROW"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(safeDealRoutes.match(/freshness: escrowFreshness\.state/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("does not expose internal TrustLayer repair or ledger language in stale responses", () => {
    expect(safeDealRoutes).not.toContain("repairProjection");
    expect(safeDealRoutes).not.toContain("ledger");
    expect(safeDealRoutes).not.toContain("settlement");
  });
});
