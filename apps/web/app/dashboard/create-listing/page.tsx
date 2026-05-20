"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { addListingImage, createListing } from "../../../lib/listings";
import { useAuthStore } from "../../../store/auth";

const categories = ["VEHICLES", "REAL_ESTATE", "ELECTRONICS", "JOBS", "SERVICES", "FASHION"] as const;
const conditions = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;

export default function CreateListingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("VEHICLES");
  const [condition, setCondition] = useState<(typeof conditions)[number]>("GOOD");
  const [locationRegion, setLocationRegion] = useState("Greater Accra");
  const [imageUrls, setImageUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      setError("Please sign in before creating a listing.");
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
        sellerId: user.id,
        title,
        description,
        price: numericPrice,
        category,
        condition,
        locationRegion
      });

      const urls = imageUrls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean);

      await Promise.all(
        urls.map((url, index) =>
          addListingImage(created.listing.id, {
            url,
            cloudinaryId: `manual_${created.listing.id}_${index}`,
            isCover: index === 0,
            sortOrder: index
          })
        )
      );

      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardShell>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
        <p className="mt-2 text-gray-600">Add a marketplace item and submit it for review.</p>

        {!user && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Sign in first so the listing can be attached to your seller account.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Title</span>
            <input
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              placeholder="Toyota Corolla 2015"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-32 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              placeholder="Describe condition, documents, delivery options, and buyer expectations."
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Price in GHS</span>
              <input
                required
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                placeholder="65000"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Location Region</span>
              <input
                value={locationRegion}
                onChange={(event) => setLocationRegion(event.target.value)}
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
                placeholder="Greater Accra"
              />
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Image URLs</span>
            <textarea
              value={imageUrls}
              onChange={(event) => setImageUrls(event.target.value)}
              className="min-h-28 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              placeholder={"https://res.cloudinary.com/.../image1.jpg\nhttps://res.cloudinary.com/.../image2.jpg"}
            />
            <span className="text-xs text-gray-500">Add one image URL per line. The first image becomes the cover image.</span>
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Condition</span>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value as (typeof conditions)[number])}
                className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900"
              >
                {conditions.map((item) => (
                  <option key={item} value={item}>
                    {item.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !user}
            className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? "Creating listing..." : "Create Listing"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
