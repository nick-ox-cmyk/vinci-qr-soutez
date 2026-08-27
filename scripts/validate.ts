import "dotenv/config";
import path from "path";
import { loadSource, LANGUAGE_ORDER, EXPECTED_QUESTION_COUNT } from "./lib/parse";
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
  const languageSummary = LANGUAGE_ORDER.map((lang) => `${lang}: ${languageCounts[lang] ?? 0}`).join(", ");

  console.log(`\n✓ Validace v pořádku.`);
  console.log(`  ${companies.size} firem, ${result.employees.length} zaměstnanců (${languageSummary})`);
  console.log(`  ${result.questions.length} otázek, ${result.questions.length * LANGUAGE_ORDER.length} překladů.`);
  if (result.questions.length !== EXPECTED_QUESTION_COUNT) {
    console.warn(
      `  ⚠ Pro ${EXPECTED_QUESTION_COUNT} QR kódů se očekává ${EXPECTED_QUESTION_COUNT} otázek, nalezeno ${result.questions.length}.`
    );
  }
}

main();
