import { apiFetch } from "./api";

export type Listing = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  category: string;
  condition?: string | null;
  locationRegion?: string | null;
  createdAt: string;
};

export async function getListings(): Promise<{ listings: Listing[] }> {
  return apiFetch<{ listings: Listing[] }>("/listings");
}
