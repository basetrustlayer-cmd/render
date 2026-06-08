"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type WhatsAppSellerButtonProps = {
  sellerWhatsappNumber?: string | null;
  listingId: string;
  sellerId: string;
  listingTitle: string;
  listingPrice?: string | number | null;
};

function normalizeWhatsAppNumber(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  return digits;
}

function formatGhsCompact(value: string | number | null | undefined): string {
  const numeric = Number(value ?? 0);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return `GH₵ ${safe.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function WhatsAppSellerButton({
  sellerWhatsappNumber,
  listingId,
  sellerId,
  listingTitle,
  listingPrice,
}: WhatsAppSellerButtonProps) {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const isOwner = user?.id === sellerId;
  const normalizedNumber = normalizeWhatsAppNumber(sellerWhatsappNumber);

  // Owner view — prompt them to set their WhatsApp number if missing
  if (isOwner && !normalizedNumber) {
    return (
      <Link
        href="/dashboard/profile"
        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 transition"
      >
        Add WhatsApp to get contacts
      </Link>
    );
  }

  // No number set — show nothing to buyers (owner already handled above)
  if (!normalizedNumber) {
    return null;
  }

  const priceText = listingPrice ? ` (${formatGhsCompact(listingPrice)})` : "";
  const listingUrl = `https://render.com.gh/listings/${listingId}`;

  const message = [
    "Hi,",
    "",
    `I found your listing on Render and I'm interested.`,
    "",
    `Listing: ${listingTitle}${priceText}`,
    `Link: ${listingUrl}`,
    "",
    "Is it still available?",
    "",
    "— Sent via Render Marketplace (render.com.gh)",
  ].join("\n");

  const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;

  async function openWhatsApp() {
    if (user?.id && user.id !== sellerId) {
      setCapturing(true);
      try {
        await apiFetch("/leads/whatsapp", {
          method: "POST",
          body: JSON.stringify({ listingId, sellerId, source: "WHATSAPP" }),
        });
      } catch {
        // Never block the buyer — lead capture is best-effort
      } finally {
        setCapturing(false);
      }
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      disabled={capturing}
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 transition"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.704a.5.5 0 00.61.61l5.845-1.476A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.366l-.358-.213-3.712.937.955-3.614-.234-.372A9.818 9.818 0 112 12c0-5.419 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
      </svg>
      {capturing ? "Opening…" : "WhatsApp seller"}
    </button>
  );
}
