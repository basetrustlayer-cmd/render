import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("database client source boundary", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/database/client.ts"),
    "utf8"
  );

  it("uses an explicit global singleton accessor", () => {
    expect(source).toContain("export function getPrismaClient()");
    expect(source).toContain("globalThis.__renderPrismaClient");
  });

  it("exports a disconnect hook for tests and graceful shutdown", () => {
    expect(source).toContain("export async function disconnectPrisma()");
    expect(source).toContain("$disconnect()");
  });

  it("keeps the legacy prisma export backed by the accessor", () => {
    expect(source).toContain("export const prisma = getPrismaClient();");
  });
});
