"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { DashboardShell } from "../../../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../../../lib/api";
import {
  addListingImage,
  getListingImageUploadSignature
} from "../../../../../lib/listings";
import { useAuthStore } from "../../../../../store/auth";

type ListingImage = {
  id: string;
  url: string;
  isCover: boolean;
};

type ListingDetail = {
  id: string;
  title: string;
  price: string;
  category: string;
  status: string;
  images: ListingImage[];
};

export default function EditListingPhotosPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadListing() {
    const result = await apiFetch<{ listing: ListingDetail }>(`/listings/${params.id}`);
    setListing(result.listing);
  }

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user?.id) return;

    loadListing().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load listing.");
    });
  }, [user?.id, params.id]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(event.target.files);
  }

  async function uploadPhotos() {
    if (!files || files.length === 0) {
      setError("Choose at least one image.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const signature = await getListingImageUploadSignature(params.id);

      for (const [index, file] of Array.from(files).entries()) {
        const form = new FormData();
        const cloudinaryApiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

        if (!cloudinaryApiKey) {
          throw new Error("NEXT_PUBLIC_CLOUDINARY_API_KEY is required.");
        }

        form.append("file", file);
        form.append("api_key", cloudinaryApiKey);
        form.append("timestamp", String(signature.timestamp));
        form.append("folder", signature.folder);
        form.append("signature", signature.signature);

        const response = await fetch(signature.uploadUrl, {
          method: "POST",
          body: form
        });

        const uploaded = (await response.json()) as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        };

        if (!response.ok || !uploaded.secure_url || !uploaded.public_id) {
          throw new Error(uploaded.error?.message ?? "Cloudinary upload failed.");
        }

        await addListingImage(params.id, {
          url: uploaded.secure_url,
          cloudinaryId: uploaded.public_id,
          isCover: !listing?.images.length && index === 0,
          sortOrder: (listing?.images.length ?? 0) + index
        });
      }

      router.push(`/listings/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photos.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <Link href="/dashboard/listings" className="text-sm underline">
          ← Back to My Listings
        </Link>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-700">Listing Photos</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {listing?.title ?? "Edit Listing"}
          </h2>
          <p className="text-gray-600">
            Add photos to this listing. The first uploaded photo becomes the cover if no image exists.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {listing?.images?.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {listing.images.map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt={listing.title}
                  className="h-40 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-100 p-8 text-center text-gray-500">
              No photos uploaded yet.
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="rounded-xl border px-4 py-3"
          />

          <button
            type="button"
            onClick={uploadPhotos}
            disabled={uploading || !user}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:bg-gray-400"
          >
            {uploading ? "Uploading photos..." : "Upload Photos"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
