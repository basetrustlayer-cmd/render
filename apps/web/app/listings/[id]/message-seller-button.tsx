"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createConversation } from "../../../lib/messages";
import { useAuthStore } from "../../../store/auth";

type Props = {
  listingId: string;
  sellerId: string;
  className: string;
};

export function MessageSellerButton({ listingId, sellerId, className }: Props) {
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

      router.push(`/messages?conversation=${conversation.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Opening..." : "Message seller"}
    </button>
  );
}
