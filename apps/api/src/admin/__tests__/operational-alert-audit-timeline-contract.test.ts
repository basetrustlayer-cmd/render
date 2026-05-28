import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("operational alert audit timeline contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/admin/routes.ts"),
    "utf8"
  );

  it("exposes a super-admin operational alert timeline endpoint", () => {
    expect(source).toContain('app.get("/admin/operations/alerts/timeline"');
    expect(source).toContain("requireSuperAdmin");
  });

  it("builds the timeline exclusively from audit and webhook read models", () => {
    expect(source).toContain("prisma.auditLog.findMany");
    expect(source).toContain("prisma.webhookEvent.findMany");
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
    expect(source).toContain('sourceModels: ["auditLog", "webhookEvent"]');
  });

  it("returns chronological operational alert transitions", () => {
    expect(source).toContain("ALERT_ACTIVE");
    expect(source).toContain("ALERT_CLEAR");
    expect(source).toContain("timeline");
    expect(source).toContain("occurredAt");
  });

  it("tracks launch readiness impact without autonomous actions", () => {
    expect(source).toContain("launchReadinessImpact");
    expect(source).not.toContain("autoRemediate");
    expect(source).not.toContain("selfHeal");
  });
});
