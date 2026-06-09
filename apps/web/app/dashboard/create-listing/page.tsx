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

type Category = (typeof categories)[number];
type Step = "form" | "uploading" | "publishing" | "done";

const CATEGORY_UNITS: Record<Category, { options: string[]; default: string }> = {
  REAL_ESTATE: { options: ["/month", "/year", "/night", "unit"], default: "/month" },
  VEHICLES:    { options: ["unit", "/day", "/month"],            default: "unit"   },
  JOBS:        { options: ["/month", "/year", "/hour", "unit"],  default: "/month" },
  SERVICES:    { options: ["/hour", "/day", "/month", "unit"],   default: "/hour"  },
  ELECTRONICS: { options: ["unit", "/month"],                    default: "unit"   },
  FASHION:     { options: ["unit"],                              default: "unit"   },
};

export default function CreateListingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("VEHICLES");
  const [priceUnit, setPriceUnit] = useState<string>(CATEGORY_UNITS["VEHICLES"].default);
  const [condition, setCondition] = useState<(typeof conditions)[number]>("GOOD");
  const [locationRegion, setLocationRegion] = useState("Greater Accra");
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);

  // UX-008: verification nudge state
  const [showVerifyNudge, setShowVerifyNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);

  useEffect(() => { hydrate(); setHydrated(true); }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user?.id) {
      router.replace("/login?next=/dashboard/create-listing");
    }
  }, [hydrated, user?.id, router]);

  function handleCategoryChange(newCategory: Category) {
    setCategory(newCategory);
    setPriceUnit(CATEGORY_UNITS[newCategory].default);
  }

  const hasImage = imageFiles && imageFiles.length > 0;
  const submitting = step === "uploading" || step === "publishing";
  const unitConfig = CATEGORY_UNITS[category];

  async function uploadImages(listingId: string) {
    if (!imageFiles || imageFiles.length === 0) return;
    const signature = await getListingImageUploadSignature(listingId);
    await Promise.all(
      Array.from(imageFiles).map(async (file, index) => {
        const form = new FormData();
        const cloudinaryApiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        if (!cloudinaryApiKey) throw new Error("NEXT_PUBLIC_CLOUDINARY_API_KEY is required.");
        form.append("file", file);
        form.append("api_key", cloudinaryApiKey);
        form.append("timestamp", String(signature.timestamp));
        form.append("folder", signature.folder);
        form.append("signature", signature.signature);
        const response = await fetch(signature.uploadUrl, { method: "POST", body: form });
        const uploaded = await response.json() as {
          secure_url?: string; public_id?: string; error?: { message?: string };
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
    if (!user?.id) { router.replace("/login?next=/dashboard/create-listing"); return; }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Enter a valid price greater than zero.");
      return;
    }
    if (!hasImage) {
      setError("Add at least one photo before publishing.");
      return;
    }

    setError(null);

    try {
      const created = await createListing({
        title,
        description,
        price: numericPrice,
        priceUnit: priceUnit === "unit" ? undefined : priceUnit,
        category,
        condition,
        locationRegion
      });

      const listingId = created.listing.id;

      setStep("uploading");
      await uploadImages(listingId);

      setStep("publishing");
      const published = await publishListing(listingId);

      setStep("done");
      setPublishedListingId(listingId);

      // UX-008: show verification nudge for Level 1 users before redirecting
      const isLevel1 = (user.verificationLevel ?? 0) === 1;
      if (isLevel1 && !nudgeDismissed) {
        setShowVerifyNudge(true);
        return; // hold — user decides to verify or skip
      }

      const billingNotice = created.billing
        ? `?billing=${encodeURIComponent(created.billing.message)}`
        : "";

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
        setError("Phone verification is required to post listings.");
      } else if (message.includes("IMAGE_REQUIRED")) {
        setError("Your image upload didn't complete. Please try again.");
      } else {
        setError(message);
      }
    }
  }

  function dismissNudgeAndContinue() {
    setShowVerifyNudge(false);
    setNudgeDismissed(true);
    if (publishedListingId) {
      router.push(`/dashboard/listings/${publishedListingId}/edit`);
      router.refresh();
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

  // UX-008: verification nudge interstitial — shown after first successful publish for Level 1 users
  if (showVerifyNudge && publishedListingId) {
    return (
      <DashboardShell>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <h2 className="mt-4 text-2xl font-black text-gray-950">Your listing is live!</h2>
          <p className="mt-2 text-gray-600">
            One more step to unlock your verified badge and TrustScore — and get serious buyers to trust you.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-900">What Ghana Card verification unlocks</p>
            <ul className="mt-3 grid gap-2">
              {[
                "Your TrustScore (0–1000) shown on every listing",
                "Ghana Card Verified badge on your profile",
                "Ability to receive Safe Deal payouts",
                "Priority placement in verified-only search filter",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="mt-0.5 font-bold text-amber-600">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-amber-700">Takes about 2 minutes. Your Ghana Card number is all you need.</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/verify?next=/dashboard/listings/${publishedListingId}/edit`}
              className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-center font-bold text-gray-950 hover:bg-amber-400 transition"
            >
              Verify now — takes 2 minutes
            </Link>
            <button
              onClick={dismissNudgeAndContinue}
              className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              I'll do this later
            </button>
          </div>
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
              <Link href="/verify" className="ml-2 font-bold underline">Verify now →</Link>
            )}
          </div>
        )}

        {submitting && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-sm font-semibold text-amber-800">
                {step === "uploading" ? "Uploading photos…" : "Running trust check and publishing…"}
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
            required minLength={3} maxLength={200}
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border px-4 py-3" placeholder="Title"
            disabled={submitting}
          />

          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="min-h-32 rounded-xl border px-4 py-3" placeholder="Description"
            disabled={submitting}
          />

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Price</label>
            <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
              <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-600">
                GH₵
              </span>
              <input
                required inputMode="decimal"
                value={price} onChange={(e) => setPrice(e.target.value)}
                className="flex-1 bg-transparent px-4 py-3 outline-none"
                placeholder="0"
                disabled={submitting}
              />
              {unitConfig.options.length > 1 ? (
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="border-l border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700 outline-none"
                  disabled={submitting}
                >
                  {unitConfig.options.map((u) => (
                    <option key={u} value={u}>{u === "unit" ? "one-off" : u}</option>
                  ))}
                </select>
              ) : (
                <span className="flex items-center border-l border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-500">
                  {unitConfig.default === "unit" ? "one-off" : unitConfig.default}
                </span>
              )}
            </div>
            {price && (
              <p className="mt-1.5 text-xs text-gray-500">
                Will display as:{" "}
                <span className="font-semibold text-gray-700">
                  GH₵ {Number(price).toLocaleString("en-GH")}
                  {priceUnit !== "unit" ? ` ${priceUnit}` : ""}
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as Category)}
                className="w-full rounded-xl border px-4 py-3"
                disabled={submitting}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as (typeof conditions)[number])}
                className="w-full rounded-xl border px-4 py-3"
                disabled={submitting}
              >
                {conditions.map((item) => (
                  <option key={item} value={item}>{item.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <input
            value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)}
            className="rounded-xl border px-4 py-3" placeholder="Region"
            disabled={submitting}
          />

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Photos <span className="text-red-500">*</span>
            </label>
            <input
              type="file" accept="image/*" multiple
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full rounded-xl border px-4 py-3"
              disabled={submitting}
            />
            {!hasImage ? (
              <p className="mt-1.5 text-xs text-gray-500">
                At least one photo is required. Listings with photos get significantly more buyer attention.
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                ✓ {imageFiles.length} photo{imageFiles.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !hasImage}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {submitting
              ? step === "uploading" ? "Uploading photos…" : "Publishing…"
              : hasImage ? "Create & publish listing" : "Add a photo to continue"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
