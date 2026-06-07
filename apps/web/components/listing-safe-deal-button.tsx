"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth";

type Props = {
  listingId: string;
  sellerId: string;
};

export function ListingSafeDealButton({ listingId, sellerId }: Props) {
  const { user, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const isOwnListing = user?.id === sellerId;

  if (isOwnListing) {
    return (
      <button
        type="button"
        disabled
        className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-center text-xs font-bold text-gray-500"
      >
        Your listing
      </button>
    );
  }

  return (
    <Link
      href={`/login?next=/safe-deal/new?listingId=${listingId}`}
      className="rounded-xl bg-amber-500 px-3 py-2 text-center text-xs font-bold text-gray-950 hover:bg-amber-400"
    >
      Start Safe Deal
    </Link>
  );
}
