import "./globals.css";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/layout/site-header";

export const metadata = {
  title: "Render.com.gh — Ghana's Verified Marketplace",
  description: "Ghana's verified marketplace powered by TrustLayer."
};

function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-gray-600">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Render.com.gh. Verified marketplace for Ghana.
          </p>
          <p>Powered by TrustLayer identity verification and Safe Deal escrow.</p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
