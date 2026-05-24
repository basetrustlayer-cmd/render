import { apiFetch } from "./api";
import type { Listing } from "./get-listings";

export type PublicSeller = {
  id: string;
  displayName: string;
  verificationLevel: number;
  verificationStatus: string;
  trustScore: number;
  trustTier: "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED";
  reviewCount: number;
  completedDeals: number;
  activeListings: number;
  memberSince: string;
};

export async function getSeller(id: string): Promise<{ seller: PublicSeller }> {
  return apiFetch<{ seller: PublicSeller }>(`/sellers/${id}`);
}

export async function getSellerListings(id: string): Promise<{ listings: Listing[] }> {
  return apiFetch<{ listings: Listing[] }>(`/sellers/${id}/listings`);
}
