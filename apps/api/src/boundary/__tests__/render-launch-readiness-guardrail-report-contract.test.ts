import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const report = readFileSync(
  resolve(process.cwd(), "../../docs/launch/render-launch-readiness-guardrail-report.md"),
  "utf8"
);

describe("Render launch readiness guardrail report contract", () => {
  it("keeps Render launch scope focused on marketplace-owned surfaces", () => {
    expect(report).toContain("Render marketplace launch readiness");
    expect(report).toContain("Listings");
    expect(report).toContain("Messaging");
    expect(report).toContain("Admin moderation");
    expect(report).toContain("SafeDeal read models and projections");
  });

  it("keeps TrustLayer as authoritative financial and trust boundary", () => {
    expect(report).toContain("TrustLayer remains authoritative");
    expect(report).toContain("escrow");
    expect(report).toContain("settlement");
    expect(report).toContain("payout");
    expect(report).toContain("ledger");
  });

  it("explicitly excludes financial execution from Render launch scope", () => {
    expect(report).toContain("Escrow fund release execution");
    expect(report).toContain("Buyer refund execution");
    expect(report).toContain("Seller payout execution");
    expect(report).toContain("Render-owned payment ledger");
  });
});
