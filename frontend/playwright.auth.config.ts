import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const backendBaseUrl = "http://127.0.0.1:8100";
const frontendBaseUrl = "http://127.0.0.1:3100";
const systemBrowserCandidates = [
  process.env.PLAYWRIGHT_EXECUTABLE_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter((candidate): candidate is string => Boolean(candidate));
const systemBrowserPath = systemBrowserCandidates.find((candidate) => existsSync(candidate));

export default defineConfig({
  testDir: "./e2e-auth",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-auth" }]],
  use: {
    baseURL: frontendBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
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
  webServer: [
    {
      command: "uv run --project ../backend uvicorn app.main:app --host 127.0.0.1 --port 8100",
      url: `${backendBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        DATABASE_URL: "sqlite:///../backend/.playwright-auth.db",
        BACKEND_CORS_ORIGINS: `${frontendBaseUrl},http://localhost:3000,http://127.0.0.1:3000`,
        APP_BASE_URL: frontendBaseUrl,
        JWT_SECRET: "playwright-auth-suite-test-secret-12345",
        SESSION_COOKIE_SECURE: "false",
        AUTO_CREATE_TABLES: "true",
        DEBUG_AUTH_TOKENS: "true",
        PYTHONPATH: "../backend",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: frontendBaseUrl,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: "ignore",
      stderr: "pipe",
      env: {
        NEXT_PUBLIC_API_BASE_URL: `${backendBaseUrl}/api/v1`,
        SESSION_COOKIE_NAME: "lumo_session",
      },
    },
  ],
});