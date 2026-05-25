import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal API response contract", () => {
  it("returns TrustLayer projection fields to callers", () => {
    expect(routes).toContain("escrowStatusCached");
    expect(routes).toContain("escrowAmountCached");
    expect(routes).toContain("escrowFeeCached");
    expect(routes).toContain("trustLayerEscrowId");
    expect(routes).toContain("checkoutUrl");
  });

  it("does not expose Render-owned SafeDeal lifecycle fields", () => {
    expect(routes).not.toContain("fundedAt");
    expect(routes).not.toContain("deliveredAt");
    expect(routes).not.toContain("confirmedAt");
    expect(routes).not.toContain("inspectionDeadline");
    expect(routes).not.toContain("feeAmount");
  });
});
