import { apiFetch } from "./api";

export type Listing = {
  id: string;
  sellerId: string;
  title: string;
  description?: string | null;
  price: number | string;
  category: string;
  condition?: string | null;
  locationRegion?: string | null;
  createdAt: string;
  seller?: {
    verificationLevel: number;
    trustScore: number | null;
    trustTier: "NEW" | "BUILDING" | "VERIFIED" | "TRUSTED" | null;
  };
  images?: Array<{
    id: string;
    url: string;
    isCover: boolean;
  }>;
};

export type ListingFilters = {
  q?: string;
  category?: string;
  locationRegion?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  verifiedOnly?: boolean;
};

export async function getListings(filters: ListingFilters = {}): Promise<{ listings: Listing[] }> {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.locationRegion) params.set("locationRegion", filters.locationRegion);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.verifiedOnly) params.set("verifiedOnly", "true");

  const query = params.toString();
  return apiFetch<{ listings: Listing[] }>(`/listings${query ? `?${query}` : ""}`);
}
