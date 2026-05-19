import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Render.com.gh — Ghana's Verified Marketplace",
  description: "Ghana's verified marketplace powered by TrustLayer."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
