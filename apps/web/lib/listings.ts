import { apiFetch } from "./api";

export type CreateListingInput = {
  sellerId: string;
  title: string;
  description?: string;
  price: number;
  category: "VEHICLES" | "REAL_ESTATE" | "ELECTRONICS" | "JOBS" | "SERVICES" | "FASHION";
  condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  locationRegion?: string;
};

export async function createListing(input: CreateListingInput) {
  return apiFetch("/listings", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
