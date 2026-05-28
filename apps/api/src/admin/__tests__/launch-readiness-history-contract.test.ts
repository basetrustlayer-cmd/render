import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness history contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("exposes a super-admin computed launch readiness history endpoint", () => {
    expect(source).toContain('app.get("/admin/operations/launch-readiness-history"');
    expect(source).toContain("requireSuperAdmin");
    expect(source).toContain("launchReadinessHistory");
  });

  it("computes history from existing operational source models only", () => {
    expect(source).toContain("prisma.auditLog.findMany");
    expect(source).toContain("prisma.webhookEvent.findMany");
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
    expect(source).toContain("sourceModels");
  });

  it("returns rolling time windows for launch readiness trend analysis", () => {
    expect(source).toContain("windowHours");
    expect(source).toContain("oneHour");
    expect(source).toContain("twentyFourHours");
    expect(source).toContain("sevenDays");
  });

  it("does not introduce persistent launch readiness tables or financial authority", () => {
    expect(source).not.toContain("launchReadinessHistory.create");
    expect(source).not.toContain("operationalSloSnapshot.create");
    expect(source).not.toContain("settlementState");
    expect(source).not.toContain("ledgerBalance");
  });
});
