"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createConversation } from "../lib/messages";
import { useAuthStore } from "../store/auth";

type Props = {
  listingId: string;
  sellerId: string;
  listingTitle: string;
};

export function ListingMessageButton({ listingId, sellerId, listingTitle }: Props) {
  const router = useRouter();
  const { accessToken, user, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const isOwnListing = user?.id === sellerId;

  async function handleClick() {
    if (!accessToken || !user?.id) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }

    if (isOwnListing) {
      router.push("/dashboard/listings");
      return;
    }

    setLoading(true);

    try {
      const conversation = await createConversation(accessToken, {
        buyerId: user.id,
        sellerId,
        listingId
      });

      const draft = `Hi, I’m interested in ${listingTitle}. Is it still available?`;

      router.push(
        `/messages?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`
      );
    } catch (error) {
      console.error(error);
      alert("Unable to start conversation.");
    } finally {
      setLoading(false);
    }
  }

  if (isOwnListing) {
    return (
      <button
        type="button"
        disabled
        className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-center text-xs font-bold text-gray-500 sm:text-sm"
      >
        Your listing
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-center text-xs font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60 sm:text-sm"
    >
      {loading ? "Opening..." : "Message"}
    </button>
  );
}
