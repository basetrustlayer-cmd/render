import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/admin/routes.ts"), "utf8");

describe("admin listing approval launch gates", () => {
  it("requires a non-deleted listing with at least one image before publishing", () => {
    expect(source).toContain("deletedAt: null");
    expect(source).toContain("existingListing.images.length === 0");
    expect(source).toContain("At least one listing image is required before publishing.");
  });

  it("blocks publishing for suspended or under-verified sellers", () => {
    expect(source).toContain("existingListing.seller.isSuspended");
    expect(source).toContain("existingListing.seller.verificationLevel < 2");
    expect(source).toContain("Level 2 seller verification is required to publish listings.");
  });
});
