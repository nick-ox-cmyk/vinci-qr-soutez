import { randomBytes } from "crypto";

/**
 * `npm run gen:secrets` — vypíše bezpečně vygenerované hodnoty pro
 * `SESSION_SECRET` a `ADMIN_URL_TOKEN` (§2 Environment proměnné).
 */
function main() {
  const sessionSecret = randomBytes(32).toString("base64url"); // > 32 znaků
  const adminUrlToken = randomBytes(18).toString("base64url"); // ~24 znaků, URL-safe

  console.log("Vlož do .env (nebo do Vercel env proměnných):\n");
  console.log(`SESSION_SECRET="${sessionSecret}"`);
  console.log(`ADMIN_URL_TOKEN="${adminUrlToken}"`);
  console.log("\nADMIN_PASSWORD si zvol vlastní — sem se negeneruje.");
}

main();
