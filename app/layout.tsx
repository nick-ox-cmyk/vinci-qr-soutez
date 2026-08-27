import type { Metadata, Viewport } from "next";
import { sourceSans, sourceSerif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ENVI QUIZ — VINCI Energies CEE",
  description: "Interní QR soutěž ENVI QUIZ pro VINCI Energies CEE.",
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
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-dscreen flex flex-col bg-surface-muted text-vinci-blue-ink">{children}</body>
    </html>
  );
}
