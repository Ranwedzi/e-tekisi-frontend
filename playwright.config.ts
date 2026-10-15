import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running stack (frontend + backend + database).
 * Start it first, e.g. from the backend repo: `docker compose up -d --build`.
 *
 *   E2E_BASE_URL  frontend (default http://localhost:3000)
 *   E2E_API_URL   backend, used to create test accounts (default http://localhost:8080)
 *   E2E_OPS_EMAIL / E2E_OPS_PASSWORD  optional operator login for the /ops test
 */
export default defineConfig({
  testDir: "./e2e",
  // One worker: the tests share one backend and its per-IP sign-in limit.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
});
