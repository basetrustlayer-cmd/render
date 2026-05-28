import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("operational alert thresholds contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("exposes a super-admin computed operational alerts endpoint", () => {
    expect(source).toContain('app.get("/admin/operations/alerts"');
    expect(source).toContain("requireSuperAdmin");
    expect(source).toContain("operationalAlerts");
  });

  it("derives alerts from existing operational read models only", () => {
    expect(source).toContain("prisma.auditLog.findMany");
    expect(source).toContain("prisma.webhookEvent.count");
    expect(source).toContain("prisma.safeDeal.count");
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
    expect(source).toContain('sourceModels: ["auditLog", "webhookEvent", "safeDeal"]');
  });

  it("defines launch alert thresholds without autonomous remediation", () => {
    expect(source).toContain("operationalAlertThresholds");
    expect(source).toContain("severity");
    expect(source).toContain("threshold");
    expect(source).toContain("cooldownMinutes");
    expect(source).not.toContain("autoRemediate");
    expect(source).not.toContain("autoFix");
  });

  it("returns deduplicated alert signals with launch readiness impact", () => {
    expect(source).toContain("dedupeKey");
    expect(source).toContain("launchReadinessImpact");
    expect(source).toContain("ALERT_ACTIVE");
    expect(source).toContain("ALERT_CLEAR");
  });
});
