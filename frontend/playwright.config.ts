import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive the real app against the real API and database.
 * Prerequisite: `docker compose up -d` (Postgres + API on :4000) from the repo root.
 * The Vite dev server is started automatically if it is not already running.
 * To test a deployed copy instead, set E2E_BASE_URL (e.g. https://waypoints.darylboon.me).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
