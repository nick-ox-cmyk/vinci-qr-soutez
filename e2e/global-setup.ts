import "dotenv/config";
import { execSync } from "child_process";
import path from "path";

const FIXTURES_DIR = path.join(process.cwd(), "e2e", "fixtures");

/**
 * Playwright globalSetup — připraví testovací databázi PŘED spuštěním e2e
 * sad (§13). Seeduje z `e2e/fixtures/*` (ne z `data/`), aby e2e testy
 * nesahaly na ostrá produkční data ani na `data/question-slugs.json`.
 *
 * Vyžaduje `DATABASE_URL` namířenou na zahazovatelnou testovací databázi
 * (viz README — `docker compose up -d` + samostatná DB/schéma pro testy).
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL není nastavená. E2E testy potřebují testovací Postgres — viz README (docker compose up -d)."
    );
  }
  if (!process.env.SESSION_SECRET || !process.env.ADMIN_URL_TOKEN || !process.env.ADMIN_PASSWORD) {
    throw new Error("SESSION_SECRET / ADMIN_URL_TOKEN / ADMIN_PASSWORD nejsou v .env nastavené — viz .env.example.");
  }

  console.log("[e2e] Synchronizuji schéma databáze (prisma db push)…");
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });

  console.log("[e2e] Seeduji testovací fixtures…");
  execSync("npx tsx scripts/seed.ts", {
    stdio: "inherit",
    env: { ...process.env, SEED_DATA_DIR: FIXTURES_DIR },
  });
}
