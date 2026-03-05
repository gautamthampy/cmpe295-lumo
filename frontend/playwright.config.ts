import { defineConfig, devices } from '@playwright/test';

/**
 * LUMO E2E test configuration.
 *
 * Prerequisites before running tests:
 *   1. docker-compose up -d
 *   2. cd backend && python -m app.seed.seed_db && uvicorn app.main:app --reload
 *   3. cd frontend && npm run test:e2e
 *
 * The config auto-starts the Next.js dev server on port 3000.
 * The FastAPI backend must already be running on port 8000.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
