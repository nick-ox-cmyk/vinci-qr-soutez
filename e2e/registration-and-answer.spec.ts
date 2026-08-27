import { test, expect } from "@playwright/test";
import { getFixtureSlug, FIXTURE_EMPLOYEES } from "./helpers";

test("complete journey: register -> question -> submit -> saved -> already answered on revisit (§13)", async ({ page }) => {
  const slug1 = getFixtureSlug(1);

  await test.step("registration on / via the employee search", async () => {
    await page.goto("/");
    const search = page.getByRole("combobox");
    await search.fill(FIXTURE_EMPLOYEES.cs.searchTerm);
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.getByRole("option").first().click();

    await expect(page.getByText(FIXTURE_EMPLOYEES.cs.fullName)).toBeVisible();
    await page.getByRole("button", { name: "Potvrdit a začít" }).click();

    await expect(page.getByText("Jsi zaregistrovaný!")).toBeVisible();
  });

  await test.step("question page shows state A and progress denominator = 20", async () => {
    await page.goto(`/q/${slug1}`);
    await expect(page.getByText(/^Otázka 1$/)).toBeVisible();
    await expect(page.getByText("0 / 20")).toBeVisible();
  });

  await test.step("submit requires a second confirmation, then shows the saved state with 1 / 20", async () => {
    await page.getByRole("radio").first().click();

    const submitButton = page.getByRole("button", { name: "Odeslat odpověď" });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Dvojí potvrzení (§6.1) — bottom sheet musí jít nejdřív zrušit beze změny stavu.
    await expect(page.getByText("Odpověď už nepůjde změnit.")).toBeVisible();
    await page.getByRole("button", { name: "Odeslat", exact: true }).click();

    await expect(page.getByText("Odpověď uložena.")).toBeVisible();
    await expect(page.getByText("Máš zodpovězeno 1 z 20 otázek.")).toBeVisible();

    // Nikdy žádná zpětná vazba o správnosti odpovědi.
    await expect(page.getByText(/správně|špatně|correct/i)).toHaveCount(0);
  });

  await test.step("revisiting the same question shows the locked already-answered state", async () => {
    await page.goto(`/q/${slug1}`);
    await expect(page.getByText("Na tuto otázku už jsi odpověděl(a).")).toBeVisible();
    // Karty odpovědí jsou needitovatelné.
    const radios = page.getByRole("radio");
    await expect(radios.first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "Odeslat odpověď" })).toHaveCount(0);
  });
});
