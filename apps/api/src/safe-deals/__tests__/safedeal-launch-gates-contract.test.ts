import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal launch gate contract", () => {
  it("requires Level 2 buyer verification before creating SafeDeals", () => {
    expect(source).toContain("buyer.verificationLevel < 2");
    expect(source).toContain("SAFE_DEAL_CREATE_BLOCKED_BUYER_VERIFICATION_LEVEL");
    expect(source).toContain("Level 2 verification is required to start a Safe Deal.");
  });

  it("enforces the GHS 200 minimum before calling TrustLayer", () => {
    expect(source).toContain("amountNumber < 200");
    expect(source).toContain("SAFE_DEAL_CREATE_BLOCKED_MINIMUM_AMOUNT");
    expect(source.indexOf("amountNumber < 200")).toBeLessThan(source.indexOf("createSafeDealIntent"));
  });

  it("caches the fixed 1.5 percent SafeDeal fee for read-model display", () => {
    expect(source).toContain("amountNumber * 0.015");
    expect(source).toContain("escrowFeeCached: safeDealFeeGhs");
  });
});
