"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createListing } from "../../../lib/listings";

export default function NewListingPage() {
  const router = useRouter();
  const [sellerId, setSellerId] = useState("");
  const [title, setTitle] = useState("Toyota Corolla 2015");
  const [description, setDescription] = useState("Clean car, strong engine, ready for inspection.");
  const [price, setPrice] = useState("65000");
  const [category, setCategory] = useState("VEHICLES");
  const [condition, setCondition] = useState("GOOD");
  const [locationRegion, setLocationRegion] = useState("Greater Accra");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    try {
      await createListing({
        sellerId,
        title,
        description,
        price: Number(price),
        category: category as any,
        condition: condition as any,
        locationRegion
      });

      router.push("/listings");
    } catch {
      alert("Failed to create listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-4xl font-bold">Create Listing</h1>

      <div className="space-y-4">
        <input className="w-full rounded border p-3" placeholder="Seller ID" value={sellerId} onChange={(e) => setSellerId(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full rounded border p-3" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input className="w-full rounded border p-3" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />

        <select className="w-full rounded border p-3" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="VEHICLES">Vehicles</option>
          <option value="REAL_ESTATE">Real Estate</option>
          <option value="ELECTRONICS">Electronics</option>
          <option value="JOBS">Jobs</option>
          <option value="SERVICES">Services</option>
          <option value="FASHION">Fashion</option>
        </select>

        <select className="w-full rounded border p-3" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="NEW">New</option>
          <option value="LIKE_NEW">Like New</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
        </select>

        <input className="w-full rounded border p-3" placeholder="Region" value={locationRegion} onChange={(e) => setLocationRegion(e.target.value)} />

        <button onClick={handleSubmit} disabled={loading} className="w-full rounded bg-black p-3 text-white">
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </div>
    </main>
  );
}
