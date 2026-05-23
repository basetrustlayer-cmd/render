import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("messaging tenant schema contract", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20260523020000_add_conversation_organization_context/migration.sql"),
    "utf8"
  );

  it("adds organization context to conversations", () => {
    expect(schema).toContain('organizationId String?   @map("organization_id") @db.Uuid');
    expect(schema).toContain("organization   Organization?");
    expect(schema).toContain("@@index([organizationId])");
    expect(schema).toContain("conversations      Conversation[]");
  });

  it("creates organization migration column, index, and foreign key", () => {
    expect(migration).toContain('ALTER TABLE "conversations" ADD COLUMN "organization_id" UUID');
    expect(migration).toContain('CREATE INDEX "conversations_organization_id_idx"');
    expect(migration).toContain('CONSTRAINT "conversations_organization_id_fkey"');
  });
});
