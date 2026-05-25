import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("legacy ledger and settlement model removal contract", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const safeDealsRoutes = readFileSync(resolve(process.cwd(), "src/safe-deals/routes.ts"), "utf8");
  const removalDoc = readFileSync(
    resolve(process.cwd(), "../../docs/architecture/legacy-ledger-settlement-model-removal.md"),
    "utf8"
  );

  it("documents removal of Render-owned ledger and settlement authority", () => {
    expect(removalDoc).toContain("Render no longer owns escrow ledger or settlement authority");
    expect(removalDoc).toContain("must not maintain a settlement ledger");
  });

  it("removes legacy financial authority models from Prisma schema", () => {
    expect(schema).not.toContain("model EscrowLedgerEntry");
    expect(schema).not.toContain("model Settlement");
    expect(schema).not.toContain("enum EscrowLedgerEntryType");
    expect(schema).not.toContain("enum SettlementStatus");
  });

  it("removes SafeDeal relations to Render-owned ledger and settlement surfaces", () => {
    expect(schema).not.toContain("ledgerEntries");
    expect(schema).not.toContain("settlement");
    expect(safeDealsRoutes).not.toContain("ledgerEntries");
    expect(safeDealsRoutes).not.toContain("settlement:");
  });
});
