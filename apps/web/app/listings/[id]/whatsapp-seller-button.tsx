"use client";

type WhatsAppSellerButtonProps = {
  sellerWhatsappNumber?: string | null;
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
  listingTitle
}: WhatsAppSellerButtonProps) {
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

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
    >
      WhatsApp Seller
    </a>
  );
}
