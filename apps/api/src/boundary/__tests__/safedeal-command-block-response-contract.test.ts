import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal command block response contract", () => {
  it("returns explicit conflict responses for stale escrow projection blocks", () => {
    expect(safeDealRoutes).toContain("return input.reply.code(409).send({");
    expect(safeDealRoutes).toContain("error: `Safe Deal escrow projection is ${input.freshness.state}. Wait for TrustLayer webhook sync before sending this command.`");
    expect(safeDealRoutes).toContain('projection: "ESCROW"');
    expect(safeDealRoutes).toContain("freshness: input.freshness.state");
  });

  it("uses one shared blocked response helper for confirm and dispute commands", () => {
    expect(safeDealRoutes.match(/error: `Safe Deal escrow projection is \$\{input\.freshness\.state\}\. Wait for TrustLayer webhook sync before sending this command\.`/g)?.length).toBe(1);
    expect(safeDealRoutes.match(/projection: "ESCROW"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(safeDealRoutes.match(/freshness: input\.freshness\.state/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("does not expose internal TrustLayer repair or ledger language in stale responses", () => {
    expect(safeDealRoutes).not.toContain("repairProjection");
    expect(safeDealRoutes).not.toContain("ledger");
    expect(safeDealRoutes).not.toContain("settlement");
  });
});
