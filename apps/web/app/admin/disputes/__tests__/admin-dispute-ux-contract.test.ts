import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const disputeListPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/page.tsx"), "utf8");
const disputeDetailPage = readFileSync(resolve(process.cwd(), "app/admin/disputes/[id]/page.tsx"), "utf8");

function assertContains(source: string, value: string): void {
  if (!source.includes(value)) {
    throw new Error(`Expected source to contain: ${value}`);
  }
}

function assertNotContains(source: string, value: string): void {
  if (source.includes(value)) {
    throw new Error(`Expected source not to contain: ${value}`);
  }
}

assertContains(disputeListPage, "/admin/disputes");
assertContains(disputeListPage, "TrustLayer remains authoritative for financial resolution");
assertContains(disputeListPage, "PENDING_PROJECTION");
assertContains(disputeListPage, "href={`/admin/disputes/${dispute.id}`}");

assertContains(disputeDetailPage, "/admin/disputes/");
assertContains(disputeDetailPage, "/note");
assertContains(disputeDetailPage, "/status");
assertContains(disputeDetailPage, "RENDER_PROJECTION_ONLY");
assertContains(disputeDetailPage, "UNDER_REVIEW");
assertContains(disputeDetailPage, "NEEDS_BUYER_RESPONSE");
assertContains(disputeDetailPage, "NEEDS_SELLER_RESPONSE");

assertNotContains(disputeDetailPage, "RESOLVED_BUYER_REFUND");
assertNotContains(disputeDetailPage, "RESOLVED_SELLER_RELEASE");
assertNotContains(disputeDetailPage, "refund");
assertNotContains(disputeDetailPage, "release");
assertNotContains(disputeDetailPage, "payout");
assertNotContains(disputeDetailPage, "settle");
