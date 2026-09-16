import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { normalizeSearchName } from "../lib/employees";

/**
 * Jednorázová oprava jmen (16. 9. 2026) — část rumunských zaměstnanců měla
 * useknuté víceslovné/spojované křestní jméno (např. "Adam-Jeno" -> "Adam").
 * `npm run seed` tohle NEOPRAVÍ, i když `data/employees.csv` už má správné
 * jméno: seed upsertuje podle (fullName, companyId), takže změna fullName
 * v CSV založí NOVÉHO zaměstnance vedle starého, ne přejmenuje toho
 * stávajícího — a kdokoli se už zaregistroval pod starým (useknutým)
 * jménem, by dál viděl to špatné jméno ve výsledcích (Participant je
 * navázaný na Employee.id, ne na jméno).
 *
 * Tenhle skript místo toho dělá přímý UPDATE nad existujícím řádkem
 * Employee — zachová jeho `id`, tím pádem i navázaného Participant/Answer.
 * Bezpečné spustit i uprostřed běžící soutěže.
 *
 * DŮLEŽITÉ POŘADÍ: spusť TOHLE **před** `npm run seed`. Pokud by seed proběhl
 * první, vytvořil by pro nové (opravené) jméno nový, prázdný Employee řádek
 * vedle starého — skript si tuhle kolizi sám ohlídá (viz níže) a takový
 * řádek nahlásí jako problém k ruční kontrole, místo aby spadl na
 * `@@unique([fullName, companyId])` a zastavil zbytek dávky.
 *
 * Idempotentní: pokud se spustí podruhé (např. omylem), řádky už
 * přejmenované na `newName` prostě nenajde pod `oldName` a nahlásí je jako
 * "already applied / nothing to do", nezkusí je přejmenovat znovu.
 *
 * `--dry-run`: nic nezapíše, jen vypíše přesně to samé hlášení, jaké by
 * vzniklo při ostrém běhu (kolik by se přejmenovalo, kolik už bylo hotovo,
 * jaké problémy by nastaly). Spusť takhle první, zkontroluj výstup (očekávej
 * "Přejmenováno: 319" / "Problémy: 0"), a teprve pak bez `--dry-run` ostře.
 */

type Rename = { oldName: string; newName: string; company: string };

const DATA_FILE = path.join(__dirname, "data", "name-corrections-2026-09-16.json");

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const renames: Rename[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  console.log(`Načteno ${renames.length} oprav jmen z ${path.basename(DATA_FILE)}.`);
  if (dryRun) console.log("--dry-run: nic se nezapíše, jen se vypíše, co by se stalo.\n");

  let updated = 0;
  let alreadyApplied = 0;
  const problems: string[] = [];

  for (const r of renames) {
    try {
      const company = await prisma.company.findUnique({ where: { name: r.company } });
      if (!company) {
        problems.push(`Firma nenalezena: "${r.company}" (pro "${r.oldName}" -> "${r.newName}")`);
        continue;
      }

      const oldRow = await prisma.employee.findUnique({
        where: { fullName_companyId: { fullName: r.oldName, companyId: company.id } },
      });

      if (!oldRow) {
        // Buď už bylo aplikováno dřív, nebo se od přípravy skriptu něco změnilo.
        const newRow = await prisma.employee.findUnique({
          where: { fullName_companyId: { fullName: r.newName, companyId: company.id } },
        });
        if (newRow) {
          alreadyApplied++;
        } else {
          problems.push(`Nenalezen ani starý, ani nový záznam: "${r.oldName}" / "${r.newName}" @ "${r.company}"`);
        }
        continue;
      }

      // Pojistka proti špatnému pořadí (kdyby `npm run seed` s opraveným CSV
      // omylem proběhl dřív): pokud pod novým jménem už existuje JINÝ řádek
      // (seed ho mezitím založil jako nového, prázdného zaměstnance), rovnou
      // to nahlas jako problém k ruční kontrole, místo aby update spadl na
      // `@@unique([fullName, companyId])` a zastavil celý zbytek dávky.
      const collidingRow = await prisma.employee.findUnique({
        where: { fullName_companyId: { fullName: r.newName, companyId: company.id } },
      });
      if (collidingRow) {
        problems.push(
          `Kolize: "${r.newName}" @ "${r.company}" už existuje (id ${collidingRow.id}) vedle starého "${r.oldName}" (id ${oldRow.id}) — vypadá to, že seed proběhl PŘED touhle opravou. Potřeba ruční sloučení, nepřejmenováno.`
        );
        continue;
      }

      if (!dryRun) {
        await prisma.employee.update({
          where: { id: oldRow.id },
          data: { fullName: r.newName, searchName: normalizeSearchName(r.newName) },
        });
      }
      updated++;
    } catch (err) {
      // Cokoli neočekávaného u jednoho řádku nezastaví zbytek dávky.
      problems.push(`Neočekávaná chyba u "${r.oldName}" -> "${r.newName}" @ "${r.company}": ${(err as Error).message}`);
    }
  }

  console.log(`\n${dryRun ? "(dry-run) Přejmenovalo by se" : "✓ Přejmenováno"}: ${updated}`);
  console.log(`  Už dřív aplikováno (přeskočeno): ${alreadyApplied}`);
  if (problems.length) {
    console.log(`  ⚠ Problémy (${problems.length}):`);
    problems.forEach((p) => console.log(`    - ${p}`));
    process.exitCode = 1;
  } else {
    console.log(`  Žádné problémy.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
