"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createConversation } from "../../../lib/messages";
import { useAuthStore } from "../../../store/auth";

type Props = {
  listingId: string;
  sellerId: string;
  listingTitle: string;
};

const buttonBlack =
  "rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-black";

const buttonAmber =
  "rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-amber-400";

const buttonGreen =
  "rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100";

export function ListingDetailActions({
  listingId,
  sellerId,
  listingTitle
}: Props) {
  const router = useRouter();
  const { accessToken, user, hydrate } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const isOwner = user?.id === sellerId;

  async function messageSeller() {
    if (!accessToken || !user?.id) {
      router.push("/login");
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
    } finally {
      setLoading(false);
    }
  }

  if (isOwner) {
    return (
      <>
        <Link href={`/dashboard/listings/${listingId}/edit`} className={buttonBlack}>
          Manage listing
        </Link>

        <Link href="/dashboard/safe-deals" className={buttonGreen}>
          Review Safe Deal Requests
        </Link>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={messageSeller} disabled={loading} className={buttonBlack}>
        {loading ? "Opening..." : "Message seller"}
      </button>

      <Link href={`/safe-deal/new?listingId=${listingId}`} className={buttonAmber}>
        Start Safe Deal
      </Link>
    </>
  );
}
