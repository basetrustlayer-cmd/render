import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "../routes.ts"), "utf8");

describe("admin listing approval gates", () => {
  it("does not require Level 2 seller verification to publish listings", () => {
    expect(source).not.toContain("existingListing.seller.verificationLevel < 2");
    expect(source).not.toContain("Level 2 seller verification is required to publish listings.");
  });

  it("still blocks suspended sellers and listings without images", () => {
    expect(source).toContain("existingListing.seller.isSuspended");
    expect(source).toContain("At least one listing image is required before publishing.");
  });
});
