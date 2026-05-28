import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("operational SLO read model contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("exposes a super-admin operational SLO summary read model", () => {
    expect(source).toContain('app.get("/admin/operations/slo-summary"');
    expect(source).toContain("requireSuperAdmin");
    expect(source).toContain("ADMIN_OPERATIONAL_SLO_SUMMARY_VIEWED");
  });

  it("computes operational status from existing audit and webhook sources", () => {
    expect(source).toContain("prisma.auditLog.findMany");
    expect(source).toContain("prisma.webhookEvent.count");
    expect(source).toContain('sourceModels: ["auditLog", "webhookEvent"]');
    expect(source).toContain('persistenceMode: "COMPUTED_READ_MODEL"');
  });

  it("surfaces launch risk without creating financial authority", () => {
    expect(source).toContain("launchRisk");
    expect(source).toContain("failedTrustLayerWebhooks");
    expect(source).toContain("pendingTrustLayerWebhooks");
    expect(source).not.toContain("releaseEscrow");
    expect(source).not.toContain("executePayout");
  });

  it("does not introduce operational SLO persistence tables", () => {
    expect(schema).not.toContain("model OperationalSlo");
    expect(schema).not.toContain("model SloBreach");
    expect(schema).not.toContain("model LaunchRisk");
  });
});
