import { defineConfig, devices } from "@playwright/test";

// §13 — e2e, mobilní viewport (iPhone 12), protože většina účastníků skenuje
// mobilem (§1). Vyžaduje testovací Postgres — viz README.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false, // fixtures jsou sdílené přes všechny testy v jedné DB
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "iPhone 12",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
