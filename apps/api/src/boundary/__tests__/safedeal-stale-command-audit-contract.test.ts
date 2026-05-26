import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const safeDealRoutes = readFileSync(resolve("src/safe-deals/routes.ts"), "utf8");

describe("SafeDeal stale command audit contract", () => {
  it("audits stale confirm and dispute command blocks", () => {
    expect(safeDealRoutes).toContain("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION");
    expect(safeDealRoutes).toContain("projection: \"ESCROW\"");
    expect(safeDealRoutes).toContain("freshness: input.freshness.state");
  });

  it("keeps blocked stale commands from reaching TrustLayer", () => {
    expect(safeDealRoutes.indexOf("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION")).toBeLessThan(
      safeDealRoutes.indexOf("confirmSafeDeal")
    );
    expect(safeDealRoutes.lastIndexOf("SAFE_DEAL_COMMAND_BLOCKED_STALE_ESCROW_PROJECTION")).toBeLessThan(
      safeDealRoutes.indexOf("openSafeDealDispute")
    );
  });

  it("does not record blocked stale commands as TrustLayer failures", () => {
    expect(safeDealRoutes).not.toContain("SAFE_DEAL_CONFIRM_FAILED_STALE_PROJECTION");
    expect(safeDealRoutes).not.toContain("SAFE_DEAL_DISPUTE_FAILED_STALE_PROJECTION");
  });
});
