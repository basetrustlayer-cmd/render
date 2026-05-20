import { apiFetch } from "./api";
import type { Listing } from "./get-listings";

export type SellerProfile = {
  id: string;
  displayName: string;
  whatsappNumber?: string | null;
  verificationLevel: number;
  verificationStatus: string;
  trustScore: number;
  trustTier: string;
  reviewCount: number;
  completedDeals: number;
  activeListings: number;
  memberSince: string;
};

export async function getListing(id: string): Promise<{
  listing: Listing;
  seller: SellerProfile;
}> {
  return apiFetch<{ listing: Listing; seller: SellerProfile }>(`/listings/${id}`);
}
