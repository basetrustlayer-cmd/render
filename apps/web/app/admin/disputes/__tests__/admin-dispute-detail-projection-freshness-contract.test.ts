import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const disputeDetailPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/[id]/page.tsx"), "utf8");

function assertContains(source: string, token: string) {
  if (!source.includes(token)) {
    throw new Error(`Expected source to contain: ${token}`);
  }
}

function assertNotContains(source: string, token: string) {
  if (source.includes(token)) {
    throw new Error(`Expected source not to contain: ${token}`);
  }
}

assertContains(disputeDetailPage, "function getProjectionFreshness");
assertContains(disputeDetailPage, "TrustLayer dispute status");
assertContains(disputeDetailPage, "TrustLayer dispute reason");
assertContains(disputeDetailPage, "TrustLayer dispute last synced");
assertContains(disputeDetailPage, "Projection freshness");
assertContains(disputeDetailPage, "PENDING_PROJECTION");
assertContains(disputeDetailPage, "NO_REASON_PROJECTED");
assertContains(disputeDetailPage, "MISSING");
assertContains(disputeDetailPage, "FRESH");
assertContains(disputeDetailPage, "STALE");

assertNotContains(disputeDetailPage, "RESOLVED_BUYER_REFUND");
assertNotContains(disputeDetailPage, "RESOLVED_SELLER_RELEASE");
assertNotContains(disputeDetailPage, "refund");
assertNotContains(disputeDetailPage, "release");
assertNotContains(disputeDetailPage, "payout");
assertNotContains(disputeDetailPage, "settle");
