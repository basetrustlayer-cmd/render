import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../routes.ts"), "utf8");

describe("listing safety policy", () => {
  it("does not require Level 2 seller verification before listing creation", () => {
    expect(source).not.toContain("seller.verificationLevel < 2");
    expect(source).not.toContain("Level 2 verification is required to create listings.");
  });

  it("keeps listing publication governed by listing risk assessment", () => {
    expect(source).toContain("assessListingRisk");
    expect(source).toContain("mapListingRiskDecisionToStatus");
  });
});
