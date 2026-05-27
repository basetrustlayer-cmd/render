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

  async function handleClick() {
    if (!accessToken || !user?.id) {
      router.push("/login");
      return;
    }

    if (user.id === sellerId) {
      router.push("/messages");
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
      router.push(`/messages?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-xl border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
    >
      {loading ? "Opening..." : "Message seller"}
    </button>
  );
}
