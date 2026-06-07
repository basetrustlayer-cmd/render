"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { DashboardShell } from "../../../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../../../lib/api";
import {
  addListingImage,
  deleteListingImage,
  getListingImageUploadSignature,
  updateListing
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
  description?: string | null;
  price: string | number;
  category: string;
  condition?: string | null;
  locationRegion?: string | null;
  status: string;
  images: ListingImage[];
};

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "VEHICLES",
    condition: "GOOD",
    locationRegion: ""
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadListing() {
    const result = await apiFetch<{ listing: ListingDetail }>(`/listings/${params.id}/owner`);

    setListing(result.listing);
    setForm({
      title: result.listing.title ?? "",
      description: result.listing.description ?? "",
      price: String(result.listing.price ?? ""),
      category: result.listing.category ?? "VEHICLES",
      condition: result.listing.condition ?? "GOOD",
      locationRegion: result.listing.locationRegion ?? ""
    });
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

  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateListing(params.id, {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        category: form.category as any,
        condition: form.condition as any,
        locationRegion: form.locationRegion
      });

      await loadListing();
      router.push(`/dashboard/listings/${params.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save listing.");
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(imageId: string) {
    setRemovingImageId(imageId);
    setError(null);

    try {
      await deleteListingImage(params.id, imageId);
      await loadListing();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove image.");
    } finally {
      setRemovingImageId(null);
    }
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
        const formData = new FormData();
        const cloudinaryApiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

        if (!cloudinaryApiKey) {
          throw new Error("NEXT_PUBLIC_CLOUDINARY_API_KEY is required.");
        }

        formData.append("file", file);
        formData.append("api_key", cloudinaryApiKey);
        formData.append("timestamp", String(signature.timestamp));
        formData.append("folder", signature.folder);
        formData.append("signature", signature.signature);

        const response = await fetch(signature.uploadUrl, {
          method: "POST",
          body: formData
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

      setFiles(null);
      await loadListing();
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
          <p className="text-sm font-semibold text-amber-700">Edit Listing</p>
          <h2 className="text-2xl font-bold text-gray-900">
            {listing?.title ?? "Edit Listing"}
          </h2>
          <p className="text-gray-600">
            Update listing details or add photos. Saved corrections return the listing to pending moderation.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={saveListing} className="mt-6 grid gap-4">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className="rounded-xl border px-4 py-3"
            placeholder="Title"
          />

          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="min-h-32 rounded-xl border px-4 py-3"
            placeholder="Description"
          />

          <input
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            className="rounded-xl border px-4 py-3"
            placeholder="Price"
            inputMode="decimal"
          />

          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="rounded-xl border px-4 py-3"
          >
            <option value="VEHICLES">Vehicles</option>
            <option value="REAL_ESTATE">Real Estate</option>
            <option value="ELECTRONICS">Electronics</option>
            <option value="JOBS">Jobs</option>
            <option value="SERVICES">Services</option>
            <option value="FASHION">Fashion</option>
          </select>

          <select
            value={form.condition}
            onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value }))}
            className="rounded-xl border px-4 py-3"
          >
            <option value="NEW">New</option>
            <option value="LIKE_NEW">Like New</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
          </select>

          <input
            value={form.locationRegion}
            onChange={(event) => setForm((current) => ({ ...current, locationRegion: event.target.value }))}
            className="rounded-xl border px-4 py-3"
            placeholder="Region"
          />

          <button
            type="submit"
            disabled={saving || !user}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:bg-gray-400"
          >
            {saving ? "Saving..." : "Save Listing Corrections"}
          </button>
        </form>

        <div className="mt-8 grid gap-4 border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900">Listing Photos</h3>

          {listing?.images?.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {listing.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img
                    src={image.url}
                    alt={listing.title}
                    className="h-40 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="text-xs font-semibold text-gray-500">
                      {image.isCover ? "Cover image" : "Listing image"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      disabled={removingImageId === image.id}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingImageId === image.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
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
