import "dotenv/config";
import path from "path";
import readline from "readline";
import { PrismaClient } from "@prisma/client";
import { loadSource, LANGUAGE_ORDER } from "./lib/parse";
import { validateSource } from "./lib/validate";
import { loadSlugMap, saveSlugMap, ensureSlugs } from "./lib/slugs";
import { normalizeSearchName } from "../lib/employees";

// SEED_DATA_DIR umožňuje nasměrovat seed na jinou složku než `data/` —
// používá to e2e test setup (e2e/fixtures), aby neplnil ostrá produkční data
// ani neměnil `data/question-slugs.json`.
const DATA_DIR = process.env.SEED_DATA_DIR ? path.resolve(process.env.SEED_DATA_DIR) : path.join(process.cwd(), "data");
const SLUGS_PATH = path.join(DATA_DIR, "question-slugs.json");

const prisma = new PrismaClient();

function confirmRegenerate(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      "Opravdu PŘEGENEROVAT všechny slugy otázek? Všech 30 vytištěných QR plakátů přestane fungovat! (y/N) ",
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === "y");
      }
    );
  });
}

async function main() {
  const regenerate = process.argv.includes("--regenerate-slugs");

  console.log(`Načítám zdroj dat z ${DATA_DIR}…`);
  let source;
  try {
    source = loadSource(DATA_DIR);
  } catch (err) {
    console.error(`\n✗ ${(err as Error).message}`);
    process.exit(1);
  }
  console.log(`Zdroj: ${source.sourceLabel}`);

  // Validuj PŘED jakýmkoli zápisem (§11.3 krok 1).
  const result = validateSource(source);
  if (!result.ok) {
    console.error(`\n✗ Nalezeno ${result.errors.length} chyb, seed se NEPROVEDL, databáze nebyla změněna:\n`);
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (regenerate) {
    console.warn("\n⚠️  VAROVÁNÍ: --regenerate-slugs přepíše VŠECHNY slugy otázek.");
    console.warn("   Všech 30 vytištěných QR plakátů přestane fungovat a bude nutné je znovu vytisknout a vyvěsit.\n");
    const confirmed = await confirmRegenerate();
    if (!confirmed) {
      console.log("Zrušeno — slugy nebyly změněny.");
      process.exit(0);
    }
  }

  const existingMap = regenerate ? {} : loadSlugMap(SLUGS_PATH);
  const slugMap = ensureSlugs(
    existingMap,
    result.questions.map((q) => q.number)
  );
  saveSlugMap(SLUGS_PATH, slugMap);

  console.log("\nZapisuji do databáze…");

  // Idempotentní zápis — upsert podle `number` resp. `(fullName, companyId)`
  // (§11.3 krok 4). Opakované spuštění nesmí nic rozbít ani smazat odpovědi:
  // otázky/zaměstnanci chybějící v aktuálním zdroji se v DB prostě ponechají.
  await prisma.$transaction(
    async (tx) => {
      const companyNames = [...new Set(result.employees.map((e) => e.company))];
      const companyIdByName = new Map<string, string>();
      for (const name of companyNames) {
        const company = await tx.company.upsert({ where: { name }, create: { name }, update: {} });
        companyIdByName.set(name, company.id);
      }

      for (const emp of result.employees) {
        const companyId = companyIdByName.get(emp.company)!;
        await tx.employee.upsert({
          where: { fullName_companyId: { fullName: emp.fullName, companyId } },
          create: {
            fullName: emp.fullName,
            searchName: normalizeSearchName(emp.fullName),
            language: emp.language,
            companyId,
            externalRef: emp.externalRef,
          },
          update: {
            searchName: normalizeSearchName(emp.fullName),
            language: emp.language,
            externalRef: emp.externalRef,
          },
        });
      }

      for (const q of result.questions) {
        const slug = slugMap[String(q.number)];
        const question = await tx.question.upsert({
          where: { number: q.number },
          // Slug se mimo --regenerate-slugs NIKDY needituje (§4).
          create: { number: q.number, slug, correctOption: q.correctOption },
          update: { correctOption: q.correctOption },
        });

        for (const lang of LANGUAGE_ORDER) {
          const tr = q.translations[lang];
          await tx.questionTranslation.upsert({
            where: { questionId_language: { questionId: question.id, language: lang } },
            create: {
              questionId: question.id,
              language: lang,
              text: tr.text,
              option1: tr.option1,
              option2: tr.option2,
              option3: tr.option3,
            },
            update: { text: tr.text, option1: tr.option1, option2: tr.option2, option3: tr.option3 },
          });
        }
      }
    },
    { timeout: 120_000 }
  );

  const languageCounts = result.employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.language] = (acc[e.language] ?? 0) + 1;
    return acc;
  }, {});
  const companies = new Set(result.employees.map((e) => e.company));
  const languageSummary = LANGUAGE_ORDER.map((lang) => `${lang}: ${languageCounts[lang] ?? 0}`).join(", ");

  console.log(`\n✓ Seed dokončen.`);
  console.log(
    `  ${companies.size} firem, ${result.employees.length} zaměstnanců (${languageSummary}), ${result.questions.length} otázek, ${result.questions.length * LANGUAGE_ORDER.length} překladů.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
