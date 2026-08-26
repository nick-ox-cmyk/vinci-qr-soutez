import "dotenv/config";
import path from "path";
import { loadSource } from "./lib/parse";
import { validateSource } from "./lib/validate";

const DATA_DIR = process.env.SEED_DATA_DIR ? path.resolve(process.env.SEED_DATA_DIR) : path.join(process.cwd(), "data");

/** `npm run validate` — jen validace CSV/XLSX, žádný zápis do DB (§11.3). */
function main() {
  console.log(`Načítám zdroj dat z ${DATA_DIR}…`);

  let source;
  try {
    source = loadSource(DATA_DIR);
  } catch (err) {
    console.error(`\n✗ ${(err as Error).message}`);
    process.exit(1);
  }
  console.log(`Zdroj: ${source.sourceLabel}`);

  const result = validateSource(source);

  if (!result.ok) {
    console.error(`\n✗ Nalezeno ${result.errors.length} chyb:\n`);
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const languageCounts = result.employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.language] = (acc[e.language] ?? 0) + 1;
    return acc;
  }, {});
  const companies = new Set(result.employees.map((e) => e.company));

  console.log(`\n✓ Validace v pořádku.`);
  console.log(
    `  ${companies.size} firem, ${result.employees.length} zaměstnanců (cs: ${languageCounts.cs ?? 0}, hu: ${languageCounts.hu ?? 0}, pl: ${languageCounts.pl ?? 0})`
  );
  console.log(`  ${result.questions.length} otázek, ${result.questions.length * 3} překladů.`);
  if (result.questions.length !== 30) {
    console.warn(`  ⚠ Pro 30 QR kódů se očekává 30 otázek, nalezeno ${result.questions.length}.`);
  }
}

main();
