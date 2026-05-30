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
  const initial = images.find((image) => image.isCover) ?? images[0];
  const [selected, setSelected] = useState(initial);

  if (!selected) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-amber-100 to-emerald-100 text-gray-600">
        No listing photos yet
      </div>
    );
  }

  return (
    <>
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gray-100 sm:aspect-[16/10]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected.url}
          alt={title}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 border-t border-gray-100 bg-white p-3 sm:grid-cols-6 sm:gap-3 sm:p-5">
          {images.slice(0, 6).map((image) => {
            const active = image.id === selected.id;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelected(image)}
                className={`aspect-square overflow-hidden rounded-xl border bg-gray-100 transition ${
                  active
                    ? "border-amber-500 ring-2 ring-amber-200"
                    : "border-gray-200 hover:border-amber-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={title}
                  className="h-full w-full object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
