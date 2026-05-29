"use client";

import { useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type WhatsAppSellerButtonProps = {
  sellerWhatsappNumber?: string | null;
  listingId: string;
  sellerId: string;
  listingTitle: string;
};

function normalizeWhatsAppNumber(value?: string | null): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("0")) {
    return `233${digits.slice(1)}`;
  }

  return digits;
}

export function WhatsAppSellerButton({
  sellerWhatsappNumber,
  listingId,
  sellerId,
  listingTitle
}: WhatsAppSellerButtonProps) {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [capturing, setCapturing] = useState(false);
  const normalizedNumber = normalizeWhatsAppNumber(sellerWhatsappNumber);

  if (!normalizedNumber) {
    return null;
  }

  const message = [
    "Hi,",
    "",
    "I found your listing on Render and I'm interested.",
    "",
    `Listing: ${listingTitle}`,
    "",
    "Is it still available?",
    "",
    "Sent from Render Marketplace"
  ].join("\n");

  const whatsappUrl = `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;

  async function openWhatsApp() {
    hydrate();

    if (user?.id && user.id !== sellerId) {
      setCapturing(true);

      try {
        await apiFetch("/leads/whatsapp", {
          method: "POST",
          body: JSON.stringify({
            listingId,
            sellerId,
            source: "WHATSAPP"
          })
        });
      } catch {
        // Do not block buyer contact if lead capture fails.
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
      className="rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
    >
      {capturing ? "Opening WhatsApp..." : "WhatsApp Seller"}
    </button>
  );
}
