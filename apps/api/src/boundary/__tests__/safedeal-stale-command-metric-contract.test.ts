import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal stale command metric contract", () => {
  it("records operational metrics for stale command blocks", () => {
    expect(safeDealRoutes).toContain("recordOperationalMetric");
    expect(safeDealRoutes).toContain('name: "api.request.completed"');
    expect(safeDealRoutes).toContain('reason: "STALE_ESCROW_PROJECTION"');
  });

  it("emits stale command metric before TrustLayer commands", () => {
    expect(safeDealRoutes.indexOf('name: "api.request.completed"')).toBeLessThan(
      safeDealRoutes.indexOf("confirmSafeDeal")
    );
    expect(safeDealRoutes.lastIndexOf('name: "api.request.completed"')).toBeLessThan(
      safeDealRoutes.indexOf("openSafeDealDispute")
    );
  });

  it("keeps stale command metric non-financial and projection-scoped", () => {
    expect(safeDealRoutes).toContain('projection: "ESCROW"');
    expect(safeDealRoutes).toContain("freshness: input.freshness.state");
    expect(safeDealRoutes).not.toContain("ledger");
    expect(safeDealRoutes).not.toContain("settlement");
  });
});
