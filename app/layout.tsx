import type { Metadata, Viewport } from "next";
import { sourceSans, sourceSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "VINCI Environment Day — QR soutěž",
  description: "Interní QR soutěž VINCI Environment Day pro VINCI Energies CZ.",
  robots: { index: false, follow: false },
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#004289",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-dscreen flex flex-col bg-surface-muted text-vinci-blue-ink">{children}</body>
    </html>
  );
}
