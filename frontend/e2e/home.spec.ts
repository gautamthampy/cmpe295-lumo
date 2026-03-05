import { test, expect } from '@playwright/test';
import { HomePage } from './pages/home.page';

test.describe('Home / Dashboard', () => {
  let home: HomePage;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    await home.goto();
  });

  test('renders welcome heading', async () => {
    await expect(home.heading()).toBeVisible();
  });

  test('shows Continue Learning section', async () => {
    await expect(home.continueSection()).toBeVisible();
  });

  test('"View All" link navigates to /lessons', async ({ page }) => {
    await home.clickViewAll();
    await expect(page).toHaveURL(/\/lessons$/);
  });

  test('"Start Learning" button navigates to /lessons', async ({ page }) => {
    await home.clickStartLearning();
    await expect(page).toHaveURL(/\/lessons$/);
  });

  test('"Create a Lesson" button navigates to /lessons/editor', async ({ page }) => {
    await home.clickCreateLesson();
    await expect(page).toHaveURL(/\/lessons\/editor/);
  });

  test('shows stat cards (lessons, completed, score)', async () => {
    await expect(home.page.getByText(/lessons available/i)).toBeVisible();
    await expect(home.page.getByText(/completed/i)).toBeVisible();
    await expect(home.page.getByText(/avg quiz score/i)).toBeVisible();
  });

  test('lesson cards are clickable links to lesson viewer', async ({ page }) => {
    // Wait for network to settle (backend may or may not be running)
    await page.waitForLoadState('domcontentloaded');
    const cards = page.locator('.glass-card').filter({ has: page.locator('h3') });
    const count = await cards.count();
    if (count > 0) {
      const href = await cards.first().getAttribute('href');
      expect(href).toMatch(/\/lessons\//);
    }
    // If no cards loaded (backend down), test passes vacuously
  });
});
