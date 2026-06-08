"use client";

import { useState } from "react";

type CopyStorefrontLinkProps = {
  sellerId: string;
  sellerName?: string;
  trustScore?: number | null;
  trustTier?: string | null;
};

/**
 * CopyStorefrontLink
 *
 * Shown on the seller's own storefront page and dashboard.
 * Generates a WhatsApp-ready share message embedding their
 * TrustScore and a direct profile link — so sellers can paste
 * this into any WhatsApp negotiation or group to establish trust.
 */
export function CopyStorefrontLink({
  sellerId,
  sellerName,
  trustScore,
  trustTier,
}: CopyStorefrontLinkProps) {
  const [copied, setCopied] = useState(false);
  const [whatsappClicked, setWhatsappClicked] = useState(false);

  const profileUrl = `https://render.com.gh/sellers/${sellerId}`;

  const trustLine = trustScore !== null && trustScore !== undefined && trustTier
    ? `TrustScore: ${trustScore}/1000 (${trustTier})`
    : "Verified seller on Render";

  const shareMessage = [
    sellerName ? `Hi, I'm ${sellerName} — a verified seller on Render.com.gh.` : "Hi, I'm a verified seller on Render.com.gh.",
    ``,
    `${trustLine}`,
    `Ghana Card verified · Fraud-checked listings · Safe Deal escrow available`,
    ``,
    `View my full trust profile and listings:`,
    profileUrl,
    ``,
    `You can message me directly on Render or start a Safe Deal for a protected transaction.`,
  ].join("\n");

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function openWhatsApp() {
    setWhatsappClicked(true);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => setWhatsappClicked(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={openWhatsApp}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.704a.5.5 0 00.61.61l5.845-1.476A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.366l-.358-.213-3.712.937.955-3.614-.234-.372A9.818 9.818 0 112 12c0-5.419 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
        </svg>
        {whatsappClicked ? "Opening WhatsApp…" : "Share trust profile"}
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
      >
        {copied ? "✓ Copied" : "Copy profile link"}
      </button>
    </div>
  );
}
