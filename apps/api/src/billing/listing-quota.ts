type ListingCountClient = {
  listing: {
    count: (args?: any) => Promise<number>;
  };
};

export const FREE_SELLER_PLAN = {
  code: "FREE",
  name: "Free Seller",
  activeListingLimit: 3,
  monthlyPrice: "0.00",
  currency: "GHS"
} as const;

export async function getSellerListingQuota(
  prisma: ListingCountClient,
  input: { sellerId: string; organizationId?: string | null }
) {
  const activeListings = await prisma.listing.count({
    where: {
      sellerId: input.sellerId,
      organizationId: input.organizationId ?? null,
      deletedAt: null,
      status: {
        in: ["PENDING", "LIVE", "MANUAL_REVIEW"]
      }
    }
  });

  return {
    plan: FREE_SELLER_PLAN,
    activeListings,
    activeListingLimit: FREE_SELLER_PLAN.activeListingLimit,
    remainingListings: Math.max(0, FREE_SELLER_PLAN.activeListingLimit - activeListings),
    allowed: activeListings < FREE_SELLER_PLAN.activeListingLimit
  };
}
