import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { sourceSans, sourceSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "VINCI Environment Day — QR soutěž",
  description: "Interní QR soutěž VINCI Environment Day pro VINCI Energies CZ.",
  robots: { index: false, follow: false },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#004289",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-dscreen flex flex-col bg-surface-muted text-vinci-blue-ink">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-border bg-surface px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-end">
            <Image
              src="/vinci-energies-logo.svg"
              alt="VINCI Energies"
              width={132}
              height={24}
              priority={false}
            />
          </div>
        </footer>
      </body>
    </html>
  );
}
