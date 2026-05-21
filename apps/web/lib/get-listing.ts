import { apiFetch } from "./api";
import type { Listing } from "./get-listings";

export type ListingImage = {
  id: string;
  url: string;
  cloudinaryId: string;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
};

export type ListingDetail = Listing & {
  images: ListingImage[];
};

export type SellerProfile = {
  id: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
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
  listing: ListingDetail;
  seller: SellerProfile;
}> {
  return apiFetch<{ listing: ListingDetail; seller: SellerProfile }>(`/listings/${id}`);
}
