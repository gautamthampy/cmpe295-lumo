import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests drive the real Next dev server and validate Google A2UI output
 * (`.a2ui-surface` + `data-surface-id` from `@a2ui/react` A2UIRenderer).
 *
 * Set `LUMO_E2E_LIVE=1` to exercise real `/api/generate` (requires working Gemini + `.env.local`).
 * By default `e2e/helpers.ts` stubs `/api/generate` so tests stay fast and deterministic.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  timeout: 240_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    // Next.js allows only one `next dev` per repo; reuse your running server locally (restart after UI changes).
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
