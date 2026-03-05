/**
 * Error state tests using Playwright route interception.
 * These tests simulate network failures and verify the app handles them gracefully.
 */
import { test, expect } from '@playwright/test';

test.describe('Error States', () => {
  test('lessons page shows error alert when backend is unreachable', async ({ page }) => {
    await page.route('**/api/v1/lessons', (route) =>
      route.abort('connectionrefused')
    );
    await page.goto('/lessons');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/could not load lessons/i)).toBeVisible();
  });

  test('lessons page error alert mentions docker-compose command', async ({ page }) => {
    await page.route('**/api/v1/lessons', (route) =>
      route.fulfill({ status: 503, body: 'Service Unavailable' })
    );
    await page.goto('/lessons');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/docker-compose/i)).toBeVisible({ timeout: 10000 });
  });

  test('lesson viewer shows error when render endpoint fails', async ({ page }) => {
    await page.route('**/api/v1/lessons/*/render**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"Lesson not found"}' })
    );
    // Use a fake UUID
    await page.goto('/lessons/00000000-0000-0000-0000-000000000999');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first()).toBeVisible({ timeout: 10000 });
  });

  test('lesson viewer shows "Back to Lessons" link on error', async ({ page }) => {
    await page.route('**/api/v1/lessons/*/render**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' })
    );
    await page.goto('/lessons/00000000-0000-0000-0000-000000000999');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /back to lessons/i })).toBeVisible({ timeout: 10000 });
  });

  test('analytics page shows error alert when summary endpoint fails', async ({ page }) => {
    await page.route('**/api/v1/lessons/analytics/summary', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.goto('/lessons/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/could not load analytics/i)).toBeVisible();
  });

  test('editor shows error when AI generation endpoint fails', async ({ page }) => {
    await page.route('**/api/v1/lessons/generate', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"detail":"Generation service unavailable"}',
      })
    );
    await page.goto('/lessons/editor');
    await page.waitForLoadState('networkidle');

    await page.locator('#topic-input').fill('Test Topic');
    await page.getByRole('button', { name: /generate.*ai/i }).click();

    await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first()).toBeVisible({ timeout: 10000 });
  });

  test('home page handles backend down gracefully (no crash)', async ({ page }) => {
    await page.route('**/api/v1/lessons', (route) =>
      route.abort('connectionrefused')
    );
    await page.goto('/');
    // Page should still render even if lessons fetch fails
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });
  });

  test('lessons page shows empty state with seed command when API returns empty array', async ({ page }) => {
    await page.route('**/api/v1/lessons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/lessons');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/no lessons found/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/seed_db/i)).toBeVisible();
  });
});
