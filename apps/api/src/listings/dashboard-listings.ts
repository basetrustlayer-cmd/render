const dashboardVisibleListingStatuses = [
  "PENDING",
  "LIVE",
  "MANUAL_REVIEW",
  "REJECTED",
  "SOLD"
] as const;

export type DashboardVisibleListingStatus = (typeof dashboardVisibleListingStatuses)[number];

export type DashboardListingsWhere = {
  sellerId: string;
  deletedAt: null;
  status: { in: DashboardVisibleListingStatus[] };
  OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
  seller: { isSuspended: false };
};

export function buildDashboardListingsWhere(input: {
  sellerId: string;
  now?: Date;
}): DashboardListingsWhere {
  return {
    sellerId: input.sellerId,
    deletedAt: null,
    status: { in: [...dashboardVisibleListingStatuses] },
    OR: [{ expiresAt: null }, { expiresAt: { gt: input.now ?? new Date() } }],
    seller: { isSuspended: false }
  };
}

export function createDashboardListingsResponse<TListing>(
  listings: readonly TListing[]
): { listings: TListing[] } {
  return { listings: [...listings] };
}
