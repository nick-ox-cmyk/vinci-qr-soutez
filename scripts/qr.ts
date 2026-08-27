import "dotenv/config";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { loadSlugMap } from "./lib/slugs";

const DATA_DIR = path.join(process.cwd(), "data");
const SLUGS_PATH = path.join(DATA_DIR, "question-slugs.json");
const OUT_DIR = path.join(process.cwd(), "out", "qr");
const SVG_OUT_DIR = path.join(OUT_DIR, "svg");

// §12 — úroveň korekce chyb H (30 %), klidová zóna 4 moduly (= `margin` v
// knihovně `qrcode`, už je to v modulech), čistě černá na bílé.
// width 800px při tisku hrany 4 cm vychází na ~508 DPI — bezpečná rezerva
// i pro tiskárny, které nepracují s nativním rozlišením PNG.
const QR_OPTIONS: QRCode.QRCodeToFileOptions = {
  errorCorrectionLevel: "H",
  margin: 4,
  width: 800,
  color: { dark: "#000000", light: "#FFFFFF" },
};

// Vektorová varianta pro tisk + volné místo uprostřed na logo VINCI Energies
// (klient si ho doplňuje sám v grafickém programu). Schválený finální rozměr:
// díra = 30 % šířky celého kódu (~9 % plochy) — bezpečně uvnitř rezervy, kterou
// dává korekce chyb H výše. Neházej to výš bez otestování skenu na papíře.
const LOGO_HOLE_FRACTION = 0.3;

function addLogoHole(svg: string): string {
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!viewBoxMatch) throw new Error("Nepodařilo se najít viewBox ve vygenerovaném SVG.");
  const size = Number(viewBoxMatch[1]);
  const hole = size * LOGO_HOLE_FRACTION;
  const offset = (size - hole) / 2;
  const rect = `<rect x="${offset.toFixed(3)}" y="${offset.toFixed(3)}" width="${hole.toFixed(3)}" height="${hole.toFixed(3)}" rx="${(hole * 0.12).toFixed(3)}" fill="#FFFFFF"/>`;
  return svg.replace("</svg>", `${rect}</svg>`);
}

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("✗ NEXT_PUBLIC_BASE_URL není nastavená. Doplň ji do .env (viz README, §15 bod 1).");
    process.exit(1);
  }
  const base = baseUrl.replace(/\/+$/, "");

  if (!fs.existsSync(SLUGS_PATH)) {
    console.error(`✗ Chybí ${SLUGS_PATH}. Nejdřív spusť \`npm run seed\`, aby se slugy vygenerovaly.`);
    process.exit(1);
  }

  const slugMap = loadSlugMap(SLUGS_PATH);
  const numbers = Object.keys(slugMap)
    .map(Number)
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    console.error("✗ data/question-slugs.json je prázdný. Nejdřív spusť `npm run seed`.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SVG_OUT_DIR, { recursive: true });

  console.log(`Generuji QR kódy do ${OUT_DIR}…`);

  await QRCode.toFile(path.join(OUT_DIR, "registrace.png"), base, QR_OPTIONS);
  console.log(`  ✓ registrace.png → ${base}`);
  const regSvg = addLogoHole(await QRCode.toString(base, { errorCorrectionLevel: "H", margin: 4, type: "svg" }));
  fs.writeFileSync(path.join(SVG_OUT_DIR, "registrace.svg"), regSvg, "utf-8");
  console.log(`  ✓ svg/registrace.svg → ${base}`);

  const csvRows = ["číslo;slug;url"];
  for (const number of numbers) {
    const slug = slugMap[String(number)];
    const url = `${base}/q/${slug}`;
    const fileName = `q-${String(number).padStart(2, "0")}.png`;
    await QRCode.toFile(path.join(OUT_DIR, fileName), url, QR_OPTIONS);
    csvRows.push(`${number};${slug};${url}`);
    console.log(`  ✓ ${fileName} → ${url}`);

    const svg = addLogoHole(await QRCode.toString(url, { errorCorrectionLevel: "H", margin: 4, type: "svg" }));
    const svgFileName = `q-${String(number).padStart(2, "0")}.svg`;
    fs.writeFileSync(path.join(SVG_OUT_DIR, svgFileName), svg, "utf-8");
    console.log(`  ✓ svg/${svgFileName} → ${url}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "qr-prehled.csv"), "﻿" + csvRows.join("\r\n") + "\r\n", "utf-8");
  console.log(`  ✓ qr-prehled.csv`);

  console.log(`\n✓ Hotovo: 1 registrační QR + ${numbers.length} otázkových QR kódů, každý ve dvou`);
  console.log(`  formátech — out/qr/*.png (bitmapa, rovnou pro /print/qr) a out/qr/svg/*.svg`);
  console.log(`  (vektor, s volným místem uprostřed na logo — viz komentář u LOGO_HOLE_FRACTION).`);
  console.log(`  Kontrolní seznam pro tisk: out/qr/qr-prehled.csv`);
  console.log(`  Tisková sestava: spusť \`npm run dev\` a otevři /print/qr.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
