import { test, expect } from "@playwright/test";
import { getFixtureSlug, FIXTURE_EMPLOYEES } from "./helpers";

// Každý test dostává čerstvý browser context (žádná cookie) — přesně
// simuluje sken QR kódu bez předchozí registrace (§5.3).
test("question without a session-cookie: inline identification loads the question in the employee's language (§5.3, §13)", async ({
  page,
}) => {
  const slug = getFixtureSlug(2);

  await page.goto(`/q/${slug}`);
  // Statický text (vč. toHaveURL níže) je vidět hned ze server-renderované
  // HTML, ještě předtím, než doběhne hydratace klientského JS — čekej na
  // networkidle, ať vyhledávání ve formuláři nezačne dřív, než se na input
  // připojí React posluchač.
  await page.waitForLoadState("networkidle");

  // Nepřesměrovává na holou "/" — řeší se inline, přímo na stránce otázky.
  await expect(page).toHaveURL(new RegExp(`/q/${slug}$`));
  // Výchozí jazyk přepínače je teď EN (§7 jazyků, EN default), ne čeština —
  // dokud si účastník nevybere jinak nebo nevybere sám sebe v hledání.
  await expect(page.getByText("Now introduce yourself.")).toBeVisible();

  const search = page.getByRole("combobox");
  await search.fill(FIXTURE_EMPLOYEES.hu.searchTerm);
  await expect(page.getByRole("option").first()).toBeVisible();
  await page.getByRole("option").first().click();

  await expect(page.getByText(FIXTURE_EMPLOYEES.hu.fullName)).toBeVisible();
  // Potvrzovací obrazovka je už v jazyce zaměstnance (§10) — maďarské tlačítko.
  await page.getByRole("button", { name: "Megerősítés és kezdés" }).click();

  // Po registraci se otázka načte NA MÍSTĚ, ve správném (maďarském) jazyce —
  // fixture otázka č. 2 má maďarský text "E2E teszt kérdés #2?".
  await expect(page.getByText("E2E teszt kérdés #2?")).toBeVisible();
  await expect(page.getByText(/^2\. kérdés$/)).toBeVisible();
});
