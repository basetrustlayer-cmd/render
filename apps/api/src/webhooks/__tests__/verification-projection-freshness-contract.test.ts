import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("webhook verification projection freshness contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/webhooks/routes.ts"), "utf8");
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("stores TrustLayer projection freshness timestamps only from webhook projection writes", () => {
    expect(schema).toContain("verificationLastSyncedAt DateTime? @map(\"verification_last_synced_at\")");
    expect(schema).toContain("verificationProjectionExpiresAt DateTime? @map(\"verification_projection_expires_at\")");
    expect(source).toContain("verificationLastSyncedAt: new Date()");
    expect(source).toContain("verificationProjectionExpiresAt: new Date(");
    expect(source).toContain("Date.now() + 30 * 24 * 60 * 60 * 1000");
  });

  it("keeps normalized verification status as TrustLayer projection data", () => {
    expect(source).toContain("verificationStatusCached: normalizeVerificationStatus(verificationStatus)");
    expect(source).not.toContain("verificationStatusCached: verificationStatus");
  });
});
