"use client";

import { useState } from "react";

type ListingImage = {
  id: string;
  url: string;
  isCover: boolean;
};

type Props = {
  title: string;
  images: ListingImage[];
};

export function ListingImageGallery({ title, images }: Props) {
  const initial =
    images.find((image) => image.isCover) ?? images[0];

  const [selected, setSelected] = useState(initial);

  if (!selected) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100 text-gray-600">
        No listing photos yet
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected.url}
          alt={title}
          className="h-96 w-full object-contain p-4"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3 border-t border-gray-100 bg-white p-5 md:grid-cols-6">
          {images.slice(0, 6).map((image) => {
            const active = image.id === selected.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelected(image)}
                className={`rounded-2xl border bg-gray-100 p-2 transition ${
                  active
                    ? "border-amber-500 ring-2 ring-amber-200"
                    : "border-gray-200 hover:border-amber-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={title}
                  className="h-24 w-full rounded-xl object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
