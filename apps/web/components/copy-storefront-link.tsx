"use client";

import { useState } from "react";

export function CopyStorefrontLink({ sellerId }: { sellerId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/sellers/${sellerId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void copyLink()}
      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-center text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50"
    >
      {copied ? "Copied!" : "Copy storefront link"}
    </button>
  );
}
