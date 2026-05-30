"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import {
  addListingImage,
  createListing,
  getListingImageUploadSignature
} from "../../../lib/listings";
import { useAuthStore } from "../../../store/auth";

const categories = ["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"] as const;
const conditions = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;

export default function CreateListingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("VEHICLES");
  const [condition, setCondition] = useState<(typeof conditions)[number]>("GOOD");
  const [locationRegion, setLocationRegion] = useState("Greater Accra");
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user?.id) {
      router.replace("/login?next=/dashboard/create-listing");
    }
  }, [hydrated, user?.id, router]);

  async function uploadImages(listingId: string) {
    if (!imageFiles || imageFiles.length === 0) return;

    const signature = await getListingImageUploadSignature(listingId);

    await Promise.all(
      Array.from(imageFiles).map(async (file, index) => {
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

        const uploaded = await response.json() as {
          secure_url?: string;
          public_id?: string;
          error?: { message?: string };
        };

        if (!response.ok || !uploaded.secure_url || !uploaded.public_id) {
          throw new Error(uploaded.error?.message ?? "Cloudinary upload failed.");
        }

        await addListingImage(listingId, {
          url: uploaded.secure_url,
          cloudinaryId: uploaded.public_id,
          isCover: index === 0,
          sortOrder: index
        });
      })
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      router.replace("/login?next=/dashboard/create-listing");
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Enter a valid price greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createListing({
        title,
        description,
        price: numericPrice,
        category,
        condition,
        locationRegion
      });

      await uploadImages(created.listing.id);

      const billingNotice = created.billing
        ? `?billing=${encodeURIComponent(created.billing.message)}`
        : "";

      router.push(`/dashboard/listings/${created.listing.id}/edit${billingNotice}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated || !user?.id) {
    return (
      <DashboardShell>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Phone verification required</h2>
          <p className="mt-2 text-gray-600">
            Please verify your phone number before creating a listing.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
        <p className="mt-2 text-gray-600">
          Add a marketplace item and upload listing photos. Phone verification is required before publishing.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <input required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border px-4 py-3" placeholder="Title" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-32 rounded-xl border px-4 py-3" placeholder="Description" />

          <div className="grid gap-5 md:grid-cols-2">
            <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl border px-4 py-3" placeholder="Price in GHS" />
            <input value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} className="rounded-xl border px-4 py-3" placeholder="Region" />
          </div>

          <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(e.target.files)} className="rounded-xl border px-4 py-3" />

          <div className="grid gap-5 md:grid-cols-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as (typeof categories)[number])} className="rounded-xl border px-4 py-3">
              {categories.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
            </select>

            <select value={condition} onChange={(e) => setCondition(e.target.value as (typeof conditions)[number])} className="rounded-xl border px-4 py-3">
              {conditions.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
            </select>
          </div>

          <button disabled={submitting} className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:bg-gray-400">
            {submitting ? "Creating listing..." : "Create Listing"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
