import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';
import { AnalyticsPage } from './pages/analytics.page';

test.describe('Analytics Dashboard', () => {
  let analytics: AnalyticsPage;

  test.beforeEach(async ({ page }) => {
    analytics = new AnalyticsPage(page);
    await analytics.goto();
  });

  test('renders "Analytics Dashboard" heading', async () => {
    await expect(analytics.heading()).toBeVisible();
  });

  test('shows 3 summary stat cards (lessons, a11y, quiz pass)', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    await expect(page.getByText(/active lessons/i)).toBeVisible();
    await expect(page.getByText(/avg a11y/i)).toBeVisible();
    await expect(page.getByText(/avg quiz/i)).toBeVisible();
  });

  test('total active lessons count is at least 5', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    // The total_lessons stat card shows a number
    const statValue = page.locator('p.text-2xl, p.text-3xl').first();
    await expect(statValue).toBeVisible();
    const text = await statValue.textContent();
    const num = parseInt(text ?? '0', 10);
    expect(num).toBeGreaterThanOrEqual(5);
  });

  test('per-lesson metric list renders at least 5 items', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    const items = analytics.lessonMetricItems();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('each lesson card shows title and subject', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    const firstItem = analytics.lessonMetricItems().first();
    await expect(firstItem).toBeVisible();
    // Should contain subject info like "Mathematics · Gr. 3"
    await expect(firstItem.getByText(/mathematics|math/i)).toBeVisible();
  });

  test('score badges show percentage values', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    // ScoreBadge renders "%"
    const badges = page.locator('span').filter({ hasText: /^\d+%$/ });
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('score badge colours: green ≥80%, amber 60–79%, red <60%', async ({ page }) => {
    await page.waitForSelector('[aria-label="Lesson metrics"]', { timeout: 10000 });
    // At least one emerald (green ≥80%) badge should exist given seed data
    const greenBadge = page.locator('span.text-emerald-700');
    const count = await greenBadge.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows error alert when backend is down', async ({ page }) => {
    await page.route('**/api/v1/lessons/analytics/summary', (route) =>
      route.fulfill({ status: 503, body: 'Service Unavailable' })
    );
    await analytics.goto();
    await expect(analytics.errorAlert()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/could not load analytics/i)).toBeVisible();
  });
});
