import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("listing expiry worker contract", () => {
  const source = readFileSync(resolve(process.cwd(), "apps/worker/src/jobs/listing-expiry.ts"), "utf8");
  const mainSource = readFileSync(resolve(process.cwd(), "apps/worker/src/main.ts"), "utf8");

  it("expires only stale live non-deleted listings", () => {
    expect(source).toContain('status: "LIVE"');
    expect(source).toContain("deletedAt: null");
    expect(source).toContain("expiresAt:");
    expect(source).toContain("lte: new Date()");
    expect(source).toContain('status: "EXPIRED"');
  });

  it("registers the expiry worker in the worker runtime", () => {
    expect(mainSource).toContain("listingExpiryWorker");
    expect(mainSource).toContain("listingExpiryWorker.close()");
  });
});
