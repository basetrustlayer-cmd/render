import { apiFetch } from "./api";

export type Listing = {
  id: string;
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

export async function getListings(): Promise<{ listings: Listing[] }> {
  return apiFetch<{ listings: Listing[] }>("/listings");
}
