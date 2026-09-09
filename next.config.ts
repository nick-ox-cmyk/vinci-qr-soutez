import type { NextConfig } from "next";
import path from "path";

// §8 — bezpečnostní hlavičky. `next/font` self-hostuje fonty pod /_next/static,
// takže není potřeba povolovat externí font-src/connect-src na Google Fonts.
//
// 'unsafe-eval' se do script-src přidává JEN v `next dev` (nikdy v produkčním
// buildu) — webpackový dev bundler zabaluje moduly do eval() kvůli Fast
// Refresh/source mapám, takže bez téhle výjimky se v `npm run dev` neprovede
// žádný klientský JS (dropdown vyhledávání, tlačítka, …) a spadne na tom i
// e2e sada (Playwright spouští appku přes `npm run dev`, viz playwright.config.ts).
// Produkční build (Vercel i VPS, `next build`) tenhle eval-bundling nepoužívá,
// tam CSP zůstává beze změny.
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Potlačí falešnou detekci monorepa, když v nadřazené složce leží
  // nesouvisející package-lock.json (mimo tento repozitář).
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
