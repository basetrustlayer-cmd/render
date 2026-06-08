"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createConversation } from "../../../lib/messages";
import { useAuthStore } from "../../../store/auth";
import { WhatsAppSellerButton } from "./whatsapp-seller-button";

type Props = {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  listingPrice: string | number;
  sellerWhatsappNumber?: string | null;
};

const primaryButton =
  "w-full rounded-xl bg-amber-500 px-5 py-3 text-center text-sm font-black text-gray-950 shadow-sm hover:bg-amber-400 sm:w-auto";

const secondaryButton =
  "w-full rounded-xl bg-gray-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-black sm:w-auto";

const ownerButton =
  "w-full rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-center text-sm font-bold text-emerald-800 hover:bg-emerald-100 sm:w-auto";

export function ListingDetailActions({ listingId, sellerId, listingTitle, listingPrice, sellerWhatsappNumber }: Props) {
  const router = useRouter();
  const { accessToken, user, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const isOwner = user?.id === sellerId;

  async function messageSeller() {
    if (!accessToken || !user?.id) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }
    setLoading(true);
    try {
      const conversation = await createConversation(accessToken, {
        buyerId: user.id,
        sellerId,
        listingId
      });
      const draft = `Hi, I'm interested in ${listingTitle}. Is it still available?`;
      router.push(`/messages?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`);
    } finally {
      setLoading(false);
    }
  }

  function startSafeDeal() {
    if (!accessToken || !user?.id) {
      router.push(`/login?next=/safe-deal/new?listingId=${listingId}`);
      return;
    }
    const params = new URLSearchParams({
      listingId,
      price: String(listingPrice),
      title: listingTitle,
    });
    router.push(`/safe-deal/new?${params.toString()}`);
  }

  if (isOwner) {
    return (
      <div className="grid w-full gap-3 sm:flex sm:flex-wrap">
        <Link href={`/dashboard/listings/${listingId}/edit`} className={secondaryButton}>
          Manage listing
        </Link>
        <Link href="/dashboard/safe-deals" className={ownerButton}>
          Review Safe Deal Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-3 sm:flex sm:flex-wrap">
      <button
        type="button"
        onClick={startSafeDeal}
        className={primaryButton}
      >
        Start Safe Deal
      </button>
      <button
        type="button"
        onClick={messageSeller}
        disabled={loading}
        className={secondaryButton}
      >
        {loading ? "Opening..." : "Message seller"}
      </button>
      <WhatsAppSellerButton
        listingId={listingId}
        sellerId={sellerId}
        listingTitle={listingTitle}
        listingPrice={listingPrice}
        sellerWhatsappNumber={sellerWhatsappNumber}
      />
    </div>
  );
}
