import { test, expect } from "@playwright/test";

const TOKEN = process.env.ADMIN_URL_TOKEN!;
const PASSWORD = process.env.ADMIN_PASSWORD!;

test.describe("results dashboard access (§7.1, §13)", () => {
  test("wrong token -> generic 404, not 403", async ({ page }) => {
    const response = await page.goto("/r/totally-wrong-token-value");
    expect(response?.status()).toBe(404);
  });

  test("correct token + wrong password -> inline error, stays on login", async ({ page }) => {
    await page.goto(`/r/${TOKEN}/login`);
    await page.getByLabel("Heslo").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Přihlásit" }).click();

    await expect(page).toHaveURL(new RegExp(`/r/${TOKEN}/login`));
    await expect(page.getByText("Nesprávné heslo.")).toBeVisible();
  });

  test("correct token + correct password -> dashboard", async ({ page }) => {
    await page.goto(`/r/${TOKEN}/login`);
    await page.getByLabel("Heslo").fill(PASSWORD);
    await page.getByRole("button", { name: "Přihlásit" }).click();

    await expect(page).toHaveURL(new RegExp(`/r/${TOKEN}$`));
    await expect(page.getByRole("heading", { name: "Výsledky — VINCI Environment Day" })).toBeVisible();
    await expect(page.getByText("Zaregistrovaní")).toBeVisible();
  });
});
