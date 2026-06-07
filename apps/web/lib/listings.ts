import { apiFetch } from "./api";

export type CreateListingInput = {
  title: string;
  description?: string;
  price: number;
  category: "VEHICLES" | "REAL_ESTATE" | "ELECTRONICS" | "JOBS" | "SERVICES" | "FASHION";
  condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  locationRegion?: string;
};


export type UpdateListingInput = Partial<CreateListingInput>;

export async function updateListing(listingId: string, input: UpdateListingInput) {
  return apiFetch(`/listings/${listingId}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export type ListingImageInput = {
  url: string;
  cloudinaryId: string;
  isCover?: boolean;
  sortOrder?: number;
};

export type CreateListingResponse = {
  listing: {
    id: string;
  };
  billing?: {
    status: "FREE_PLAN_INCLUDED" | "PENDING_PAYMENT";
    planCode?: string;
    activeListingLimit?: number;
    activeListingsAfterCreate?: number;
    amount?: string;
    currency: "GHS";
    provider?: "PROCESSOR_PENDING";
    message: string;
  };
};

export async function createListing(input: CreateListingInput): Promise<CreateListingResponse> {
  return apiFetch<CreateListingResponse>("/listings", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function addListingImage(listingId: string, input: ListingImageInput) {
  return apiFetch(`/listings/${listingId}/images`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type CloudinarySignatureResponse = {
  cloudName: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

export async function getListingImageUploadSignature(listingId: string): Promise<CloudinarySignatureResponse> {
  return apiFetch<CloudinarySignatureResponse>(`/listings/${listingId}/images/signature`, {
    method: "POST",
    body: JSON.stringify({})
  });
}


export async function deleteListingImage(listingId: string, imageId: string) {
  return apiFetch(`/listings/${listingId}/images/${imageId}`, {
    method: "DELETE"
  });
}


export async function setListingCoverImage(listingId: string, imageId: string) {
  return apiFetch(`/listings/${listingId}/images/${imageId}/cover`, {
    method: "PATCH"
  });
}
