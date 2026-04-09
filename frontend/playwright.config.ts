import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'npm run dev';
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true'
  ? true
  : !process.env.CI && !process.env.PLAYWRIGHT_BASE_URL;

const systemBrowserCandidates = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter((candidate): candidate is string => Boolean(candidate));
const systemBrowserPath = systemBrowserCandidates.find((candidate) => existsSync(candidate));

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
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Use domcontentloaded instead of networkidle — Next.js 15 HMR keeps
    // connections alive indefinitely, causing networkidle to never resolve.
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(systemBrowserPath
          ? {
              launchOptions: {
                executablePath: systemBrowserPath,
              },
            }
          : {}),
      },
    },
  ],

  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
