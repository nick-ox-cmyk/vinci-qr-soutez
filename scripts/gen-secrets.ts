import { randomBytes } from "crypto";

/**
 * `npm run gen:secrets` — vypíše bezpečně vygenerované hodnoty pro
 * `SESSION_SECRET`, `ADMIN_URL_TOKEN` a `COMPETITION_BYPASS_TOKEN` (§2, §9).
 */
function main() {
  const sessionSecret = randomBytes(32).toString("base64url"); // > 32 znaků
  const adminUrlToken = randomBytes(18).toString("base64url"); // ~24 znaků, URL-safe
  const bypassToken = randomBytes(18).toString("base64url");

  console.log("Vlož do .env (nebo do Vercel env proměnných):\n");
  console.log(`SESSION_SECRET="${sessionSecret}"`);
  console.log(`ADMIN_URL_TOKEN="${adminUrlToken}"`);
  console.log(`COMPETITION_BYPASS_TOKEN="${bypassToken}"  # nepovinné, jen pro testování mimo časové okno (§9)`);
  console.log("\nADMIN_PASSWORD si zvol vlastní — sem se negeneruje.");
}

main();
