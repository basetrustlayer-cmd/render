"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import {
  addListingImage,
  createListing,
  getListingImageUploadSignature,
  publishListing
} from "../../../lib/listings";
import { useAuthStore } from "../../../store/auth";

const categories = ["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"] as const;
const conditions = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;

type Step = "form" | "uploading" | "publishing" | "done";

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
  const [step, setStep] = useState<Step>("form");
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

  // G3: image is required before publish — disable submit if none selected
  const hasImage = imageFiles && imageFiles.length > 0;
  const submitting = step === "uploading" || step === "publishing";

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

    if (!hasImage) {
      setError("Add at least one photo before publishing. Listings without photos won't appear in search.");
      return;
    }

    setError(null);

    try {
      // Phase 1 — create listing in PENDING
      const created = await createListing({
        title,
        description,
        price: numericPrice,
        category,
        condition,
        locationRegion
      });

      const listingId = created.listing.id;

      // Phase 2 — upload cover image
      setStep("uploading");
      await uploadImages(listingId);

      // Phase 3 — publish (runs risk assessment, promotes from PENDING)
      setStep("publishing");
      const published = await publishListing(listingId);

      setStep("done");

      const billingNotice = created.billing
        ? `?billing=${encodeURIComponent(created.billing.message)}`
        : "";

      // If rejected by TrustLayer, send to edit page with notice
      if (published.riskAssessment?.decision === "REJECTED") {
        router.push(`/dashboard/listings/${listingId}/edit?status=rejected`);
      } else {
        router.push(`/dashboard/listings/${listingId}/edit${billingNotice}`);
      }

      router.refresh();
    } catch (err) {
      setStep("form");
      const message = err instanceof Error ? err.message : "Unable to create listing.";
      if (message.includes("VERIFICATION_REQUIRED") || message.includes("403")) {
        setError("Phone verification is required to post listings. Verify your number first.");
      } else if (message.includes("IMAGE_REQUIRED")) {
        setError("Your image upload didn't complete. Please try again.");
      } else {
        setError(message);
      }
    }
  }

  if (!hydrated || !user?.id) {
    return (
      <DashboardShell>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">Sign in required</h2>
          <p className="mt-2 text-gray-600">Please sign in before creating a listing.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
        <p className="mt-2 text-gray-600">
          Add details and at least one photo. Your listing is reviewed before going live.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            {error.includes("verification") && (
              <Link href="/verify" className="ml-2 font-bold underline">
                Verify now →
              </Link>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {submitting && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-sm font-semibold text-amber-800">
                {step === "uploading" && "Uploading photos…"}
                {step === "publishing" && "Running trust check and publishing…"}
              </p>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: step === "uploading" ? "50%" : "90%" }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <input
            required
            minLength={3}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border px-4 py-3"
            placeholder="Title"
            disabled={submitting}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-32 rounded-xl border px-4 py-3"
            placeholder="Description"
            disabled={submitting}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl border px-4 py-3"
              placeholder="Price in GHS"
              disabled={submitting}
            />
            <input
              value={locationRegion}
              onChange={(e) => setLocationRegion(e.target.value)}
              className="rounded-xl border px-4 py-3"
              placeholder="Region"
              disabled={submitting}
            />
          </div>

          {/* G3: photo upload — required before publish */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Photos <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full rounded-xl border px-4 py-3"
              disabled={submitting}
            />
            {!hasImage && (
              <p className="mt-1.5 text-xs text-gray-500">
                At least one photo is required. Listings with photos get significantly more buyer attention.
              </p>
            )}
            {hasImage && (
              <p className="mt-1.5 text-xs text-emerald-700 font-semibold">
                ✓ {imageFiles.length} photo{imageFiles.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}
              className="rounded-xl border px-4 py-3"
              disabled={submitting}
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item.replace("_", " ")}</option>
              ))}
            </select>

            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as (typeof conditions)[number])}
              className="rounded-xl border px-4 py-3"
              disabled={submitting}
            >
              {conditions.map((item) => (
                <option key={item} value={item}>{item.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting || !hasImage}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {submitting
              ? step === "uploading" ? "Uploading photos…" : "Publishing…"
              : hasImage
              ? "Create & publish listing"
              : "Add a photo to continue"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
