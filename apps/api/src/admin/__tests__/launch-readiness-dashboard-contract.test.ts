import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("launch readiness dashboard contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

  it("exposes a super-admin computed launch readiness dashboard endpoint", () => {
    expect(source).toContain('app.get("/admin/operations/launch-dashboard"');
    expect(source).toContain("requireSuperAdmin");
    expect(source).toContain("launchReadinessDashboard");
  });

  it("aggregates operational governance surfaces without persistence", () => {
    expect(source).toContain("sloSummary");
    expect(source).toContain("launchReadinessHistory");
    expect(source).toContain("operationalAlerts");
    expect(source).toContain("alertTimeline");
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
  });

  it("keeps the dashboard read-only and manual-governance only", () => {
    expect(source).not.toContain("autoRemediate");
    expect(source).not.toContain("selfHeal");
    expect(source).toContain("MANUAL_OPERATOR_REVIEW_REQUIRED");
  });

  it("returns canonical launch risk metadata", () => {
    expect(source).toContain("launchRisk");
    expect(source).toContain("launchReadinessImpact");
    expect(source).toContain("sourceModels");
    expect(source).toContain("generatedAt");
  });
});
