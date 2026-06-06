export type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  status: string;
  viewsCount: number;
  createdAt: string;
  images?: { id: string; url: string; isCover: boolean }[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isListingImage(value: unknown): value is NonNullable<Listing["images"]>[number] {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    typeof value.isCover === "boolean"
  );
}

function isListing(value: unknown): value is Listing {
  if (!isRecord(value)) return false;

  const images = value.images;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.price === "string" &&
    typeof value.category === "string" &&
    typeof value.status === "string" &&
    typeof value.viewsCount === "number" &&
    typeof value.createdAt === "string" &&
    (images === undefined || (Array.isArray(images) && images.every(isListingImage)))
  );
}

export function parseDashboardListingsResponse(value: unknown): Listing[] | null {
  if (!isRecord(value) || !Array.isArray(value.listings)) {
    return null;
  }

  return value.listings.every(isListing) ? value.listings : null;
}
