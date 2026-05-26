import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const disputeListPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/page.tsx"), "utf8");
const disputeDetailPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/[id]/page.tsx"), "utf8");

describe("admin dispute projection freshness UX contract", () => {
  it("exposes TrustLayer projection freshness filters on the dispute list", () => {
    expect(disputeListPage).toContain("disputeProjectionFreshness");
    expect(disputeListPage).toContain("PENDING_PROJECTION");
    expect(disputeListPage).toContain("FRESH");
    expect(disputeListPage).toContain("STALE");
    expect(disputeListPage).toContain("MISSING");
  });

  it("shows projection sync timestamps without financial execution language", () => {
    expect(disputeListPage).toContain("disputeLastSyncedAt");
    expect(disputeDetailPage).toContain("disputeLastSyncedAt");

    expect(disputeListPage).not.toContain("refund");
    expect(disputeListPage).not.toContain("release");
    expect(disputeListPage).not.toContain("payout");
    expect(disputeDetailPage).not.toContain("refund");
    expect(disputeDetailPage).not.toContain("release");
    expect(disputeDetailPage).not.toContain("payout");
  });
});
