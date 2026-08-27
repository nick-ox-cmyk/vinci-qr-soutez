// Firemní řezy VinciSans / VinciSerif Bold jsou licencované a v repu nejsou
// (§9.2). Do jejich dodání používáme Source Sans 3 / Source Serif 4 jako
// nejbližší volně dostupnou náhradu.
//
// Subsety: `latin-ext` kvůli diakritice cs/sk/pl/hu/ro (ě š č ř ž ő ű ą ę ł
// ń ś ź ż ș ț) a `cyrillic` kvůli bulharštině (bg) — bez něj by bulharský
// text spadl na fallback font bez CEE/cyrilice.
//
// Až klient dodá licencované soubory, stačí tady přepnout na `next/font/local`
// — zbytek aplikace používá jen CSS proměnné `--font-sans` / `--font-serif`,
// takže se nikde jinde nic nemění.
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

export const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

export const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["700"],
  display: "swap",
});

// Příklad budoucí náhrady lokálními fonty (ponecháno jako komentář, dokud
// nedorazí licencované soubory VinciSans / VinciSerif):
//
// import localFont from "next/font/local";
// export const sourceSans = localFont({
//   variable: "--font-sans",
//   src: [
//     { path: "../public/fonts/VinciSans-Regular.woff2", weight: "400" },
//     { path: "../public/fonts/VinciSans-Medium.woff2", weight: "500" },
//     { path: "../public/fonts/VinciSans-Bold.woff2", weight: "700" },
//     { path: "../public/fonts/VinciSans-Black.woff2", weight: "900" },
//   ],
// });
// export const sourceSerif = localFont({
//   variable: "--font-serif",
//   src: [{ path: "../public/fonts/VinciSerif-Bold.woff2", weight: "700" }],
// });
