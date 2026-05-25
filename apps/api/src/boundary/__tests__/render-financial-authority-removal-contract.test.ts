import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Render financial authority removal contract", () => {
  const removalDoc = readFileSync(
    resolve(process.cwd(), "../../docs/architecture/render-financial-authority-removal.md"),
    "utf8"
  );

  const safeDealsRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");
  const webhookRoutes = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");

  it("documents removal of Render-owned financial authority", () => {
    expect(removalDoc).toContain("Render must not expose financial authority routes");
    expect(removalDoc).toContain("TrustLayer remains the only authority");
  });

  it("removes SafeDeal ledger endpoint from Render launch surface", () => {
    expect(safeDealsRoutes).not.toContain('app.get("/safe-deals/:id/ledger"');
  });

  it("prevents TrustLayer webhook projection sync from creating Render-owned settlement authority", () => {
    expect(webhookRoutes).not.toContain("createSettlementLedgerForConfirmedDeal");
    expect(webhookRoutes).not.toContain("SETTLEMENT_READY_FROM_TRUSTLAYER_WEBHOOK");
  });
});
