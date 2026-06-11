import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Render — Ghana's Verified Marketplace",
    short_name: "Render",
    description: "Buy and sell with Ghana Card-verified sellers and Safe Deal escrow protection.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F2EC",
    theme_color: "#1A1714",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
