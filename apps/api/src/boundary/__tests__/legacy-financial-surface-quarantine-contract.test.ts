import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy financial surface quarantine contract", () => {
  const quarantineDoc = readFileSync(
    resolve(process.cwd(), "../../docs/architecture/render-legacy-financial-surface-quarantine.md"),
    "utf8"
  );

  const safeDealsRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");
  const settlementSource = readFileSync(resolve(process.cwd(), "src/ledger/settlement.ts"), "utf8");

  it("documents legacy financial surfaces as quarantined, not authoritative", () => {
    expect(quarantineDoc).toContain("legacy transitional surfaces");
    expect(quarantineDoc).toContain("projection-only read models");
    expect(quarantineDoc).toContain("Render must not operate as a financial authority");
  });

  it("blocks new financial authority verbs from marketplace routes", () => {
    const forbidden = [
      "executePayout(",
      "releaseFunds(",
      "approvePayout(",
      "adjudicateDispute(",
      "reconcileFinancialLedger("
    ];

    for (const pattern of forbidden) {
      expect(safeDealsRoutes).not.toContain(pattern);
      expect(settlementSource).not.toContain(pattern);
    }
  });

  it("requires future extraction or projection-only reclassification", () => {
    expect(quarantineDoc).toContain("remove these models/routes");
    expect(quarantineDoc).toContain("rename/reclassify them as TrustLayer projection read models");
  });
});
