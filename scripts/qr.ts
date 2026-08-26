import "dotenv/config";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { loadSlugMap } from "./lib/slugs";

const DATA_DIR = path.join(process.cwd(), "data");
const SLUGS_PATH = path.join(DATA_DIR, "question-slugs.json");
const OUT_DIR = path.join(process.cwd(), "out", "qr");

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

  console.log(`Generuji QR kódy do ${OUT_DIR}…`);

  await QRCode.toFile(path.join(OUT_DIR, "registrace.png"), base, QR_OPTIONS);
  console.log(`  ✓ registrace.png → ${base}`);

  const csvRows = ["číslo;slug;url"];
  for (const number of numbers) {
    const slug = slugMap[String(number)];
    const url = `${base}/q/${slug}`;
    const fileName = `q-${String(number).padStart(2, "0")}.png`;
    await QRCode.toFile(path.join(OUT_DIR, fileName), url, QR_OPTIONS);
    csvRows.push(`${number};${slug};${url}`);
    console.log(`  ✓ ${fileName} → ${url}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "qr-prehled.csv"), "﻿" + csvRows.join("\r\n") + "\r\n", "utf-8");
  console.log(`  ✓ qr-prehled.csv`);

  console.log(`\n✓ Hotovo: 1 registrační QR + ${numbers.length} otázkových QR kódů.`);
  console.log(`  Kontrolní seznam pro tisk: out/qr/qr-prehled.csv`);
  console.log(`  Tisková sestava: spusť \`npm run dev\` a otevři /print/qr.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
