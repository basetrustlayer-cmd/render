import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("listing route tenant and ownership contract", () => {
  const source = readFileSync(resolve(process.cwd(), "src/listings/routes.ts"), "utf8");

  it("keeps public listing catalog reads unauthenticated", () => {
    expect(source).toContain('app.get("/listings", async (request, reply) => {');
    expect(source).toContain('app.get("/listings/:id", async (request, reply) => {');
    expect(source).toContain('app.get("/listings/:id/images", async (request, reply) => {');
  });

  it("keeps write and owner listing routes authenticated", () => {
    expect(source).toContain('app.get("/listings/my", { preHandler: authenticate }');
    expect(source).toContain('app.post("/listings", { preHandler: authenticate }');
    expect(source).toContain('app.post("/listings/:id/images/signature", { preHandler: authenticate }');
    expect(source).toContain('app.post("/listings/:id/images", { preHandler: authenticate }');
  });

  it("creates listings in pending state and resolves optional organization context", () => {
    expect(source).toContain("resolveOptionalOrganizationContext");
    expect(source).toContain('status: "PENDING"');
    expect(source).toContain("organizationId: organizationMembership?.organizationId");
    expect(source).toContain('return reply.code(403).send({ error: "Invalid organization context." })');
  });

  it("keeps public reads constrained to live non-deleted listings", () => {
    expect(source.match(/status: "LIVE"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source.match(/deletedAt: null/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("requires listing ownership before image mutation operations", () => {
    expect(source).toContain('Only the listing owner can upload images.');
    expect(source).toContain('Only the listing owner can add images.');
  });

  it("requires organization access before image signature and image create operations", () => {
    expect(source.match(/requireListingOrganizationAccess/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source.match(/Invalid organization context/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("keeps image count bounded and cover-image replacement deterministic", () => {
    expect(source).toContain("Maximum 10 images per listing.");
    expect(source).toContain("updateMany");
    expect(source).toContain("isCover: false");
  });

  it("keeps Cloudinary signing server-side only", () => {
    expect(source).toContain("CLOUDINARY_CLOUD_NAME");
    expect(source).toContain("CLOUDINARY_API_SECRET");
    expect(source).toContain('crypto.createHash("sha1")');
    expect(source).toContain("uploadUrl");
  });
});
