import { defineConfig, devices } from "@playwright/test";

// §13 — e2e, mobilní viewport (iPhone 12), protože většina účastníků skenuje
// mobilem (§1). Vyžaduje testovací Postgres — viz README.
//
// Base URL je NAPEVNO localhost, ne `process.env.NEXT_PUBLIC_BASE_URL` — ten
// je v `.env` nastavený na skutečnou nasazenou doménu appky (kvůli generování
// QR kódů, §10), ne na testovací localhost. `webServer` níže si stejně vždycky
// nastartuje vlastní `npm run dev` na portu 3000, takže by to nikdy nemělo
// mířit jinam. (Býval tu právě `?? "http://localhost:3000"` fallback, který
// vypadal neškodně, ale jakmile `globalSetup.ts` načetl `.env` přes
// `dotenv/config`, `NEXT_PUBLIC_BASE_URL` už nebyla `undefined` a e2e sada
// tiše běžela proti ostré/nasazené appce, ne proti tomuhle lokálnímu serveru.)
const LOCAL_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // fixtures jsou sdílené přes všechny testy v jedné DB
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: LOCAL_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPhone 12",
      use: { ...devices["iPhone 12"] },
    },
  ],
  // Produkční build, ne `next dev` — dev server kompiluje stránky/routy
  // on-demand a webpack umí uprostřed testu spustit Fast Refresh full reload,
  // což se projevuje jako náhodně padající testy (pomalá první hydratace,
  // "Navigation interrupted by another navigation"). Produkční build tohle
  // nemá a je to navíc přesně to, co běží všude ostro (Vercel i VPS, §10).
  webServer: {
    command: "npm run build && npm run start",
    url: LOCAL_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
