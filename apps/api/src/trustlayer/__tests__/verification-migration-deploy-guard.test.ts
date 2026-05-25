import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("verification projection migration deploy guard", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "prisma/migrations/20260525_add_verification_projection_freshness/migration.sql"
    ),
    "utf8"
  );

  it("keeps Prisma User model aligned with verification projection freshness columns", () => {
    expect(schema).toContain('verificationLastSyncedAt DateTime? @map("verification_last_synced_at")');
    expect(schema).toContain('verificationProjectionExpiresAt DateTime? @map("verification_projection_expires_at")');
  });

  it("ships an idempotent database migration for verification projection freshness", () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "verification_last_synced_at"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "verification_projection_expires_at"');
  });

  it("keeps verification projection freshness optional for existing users", () => {
    expect(schema).not.toContain("verificationLastSyncedAt DateTime @");
    expect(schema).not.toContain("verificationProjectionExpiresAt DateTime @");
    expect(migration).not.toContain("NOT NULL");
  });
});
