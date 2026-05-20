import { apiFetch } from "./api";
import type { Listing } from "./get-listings";

export async function getListing(id: string): Promise<{ listing: Listing }> {
  return apiFetch<{ listing: Listing }>(`/listings/${id}`);
}
