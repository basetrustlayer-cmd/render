import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SafeDeal ledger endpoint quarantine contract", () => {
  const quarantineDoc = readFileSync(
    resolve(process.cwd(), "../../docs/architecture/safedeal-ledger-endpoint-quarantine.md"),
    "utf8"
  );

  const safeDealsRoutes = readFileSync(
    resolve(process.cwd(), "src/safe-deals/routes.ts"),
    "utf8"
  );

  it("documents the SafeDeal ledger endpoint as non-launch legacy surface", () => {
    expect(quarantineDoc).toContain("not a Render launch feature");
    expect(quarantineDoc).toContain("legacy transitional endpoint");
    expect(quarantineDoc).toContain("TrustLayer projection-only audit view");
  });

  it("keeps any ledger endpoint classified as non-authoritative", () => {
    expect(quarantineDoc).toContain("must not be presented as financial ledger authority");
    expect(quarantineDoc).toContain("Render must not expose or imply authoritative");
  });

  it("prevents the route from adding authority actions", () => {
    expect(safeDealsRoutes).not.toContain("releaseFunds(");
    expect(safeDealsRoutes).not.toContain("executePayout(");
    expect(safeDealsRoutes).not.toContain("reconcileSettlement(");
    expect(safeDealsRoutes).not.toContain("approvePayout(");
  });
});
