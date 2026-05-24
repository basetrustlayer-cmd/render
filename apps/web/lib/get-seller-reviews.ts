import { apiFetch } from "./api";

export type SellerReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    displayName: string;
  };
};

export type SellerReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

export async function getSellerReviews(
  id: string
): Promise<{ summary: SellerReviewSummary; reviews: SellerReview[] }> {
  return apiFetch<{ summary: SellerReviewSummary; reviews: SellerReview[] }>(
    `/sellers/${id}/reviews`
  );
}
