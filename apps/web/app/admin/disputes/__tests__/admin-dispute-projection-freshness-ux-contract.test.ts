import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const disputeListPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/page.tsx"), "utf8");
const disputeDetailPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/[id]/page.tsx"), "utf8");

function assertContains(source: string, token: string) {
  if (!source.includes(token)) throw new Error(`Expected source to contain: ${token}`);
}

function assertNotContains(source: string, token: string) {
  if (source.includes(token)) throw new Error(`Expected source not to contain: ${token}`);
}

assertContains(disputeListPage, "disputeProjectionFreshness");
assertContains(disputeListPage, "PENDING_PROJECTION");
assertContains(disputeListPage, "FRESH");
assertContains(disputeListPage, "STALE");
assertContains(disputeListPage, "MISSING");
assertContains(disputeListPage, "disputeLastSyncedAt");
assertContains(disputeDetailPage, "disputeLastSyncedAt");

assertNotContains(disputeListPage, "refund");
assertNotContains(disputeListPage, "release");
assertNotContains(disputeListPage, "payout");
assertNotContains(disputeDetailPage, "refund");
assertNotContains(disputeDetailPage, "release");
assertNotContains(disputeDetailPage, "payout");
