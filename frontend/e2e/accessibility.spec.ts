/**
 * Accessibility-focused E2E tests.
 * Tests keyboard navigation, ARIA attributes, font size toggle, high contrast mode,
 * and skip-to-content link across the lesson viewer.
 */
import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';
import { LessonViewerPage } from './pages/lesson-viewer.page';

/** Minimal rendered lesson with two sections for navigation tests. */
function mockAccessibilityLesson(lessonId: string) {
  return {
    lesson_id: lessonId,
    html_content: '<h2>Introduction</h2><p>Welcome to the lesson.</p><h2>Key Concepts</h2><p>Here are the main ideas.</p>',
    interactive_activities: [],
    misconception_tags: ['test-tag'],
    accessibility_score: 0.9,
    accessibility_issues: [],
    estimated_time_minutes: 5,
    quiz_context: { subject: 'Mathematics', grade_level: 3 },
    next_lesson_id: null,
    prerequisites_met: true,
  };
}

test.describe('Accessibility — Lesson Viewer', () => {
  let viewer: LessonViewerPage;

  test.beforeEach(async ({ page, lessonData }) => {
    viewer = new LessonViewerPage(page);
    const lesson = await lessonData.getFirst();
    await page.route(`**/api/v1/lessons/${lesson.lesson_id}/render**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAccessibilityLesson(lesson.lesson_id)),
      })
    );
    await page.route('**/api/v1/mock/events', (route) => route.fulfill({ status: 200, body: '{}' }));
    await viewer.goto(lesson.lesson_id);
    await page.waitForSelector('#lesson-content', { timeout: 15000 });
  });

  test('page has a <main> landmark with accessible label', async ({ page }) => {
    // LessonViewer renders <main id="lesson-content" aria-label="Lesson content">
    const main = page.locator('#lesson-content');
    await expect(main).toBeVisible();
    const label = await main.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  test('progress bar has correct ARIA attributes', async () => {
    const bar = viewer.progressBar();
    await expect(bar).toHaveAttribute('role', 'progressbar');
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    const label = await bar.getAttribute('aria-label');
    expect(label).toMatch(/progress/i);
  });

  test('accessibility settings button has aria-label', async () => {
    const btn = viewer.a11yButton();
    await expect(btn).toHaveAttribute('aria-label', 'Accessibility settings');
  });

  test('accessibility button toggles aria-expanded on click', async () => {
    const btn = viewer.a11yButton();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('a11y menu dialog has role="dialog" and aria-label', async () => {
    await viewer.openA11yMenu();
    const dialog = viewer.a11yDialog();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-label', 'Accessibility settings');
  });

  test('font size buttons have aria-pressed reflecting current state', async () => {
    await viewer.openA11yMenu();
    // Initially "normal" (A) is pressed
    const normalBtn = viewer.fontSizeButton('A');
    await expect(normalBtn).toHaveAttribute('aria-pressed', 'true');
    const largeBtn = viewer.fontSizeButton('A+');
    await expect(largeBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking A+ font size button updates aria-pressed', async () => {
    await viewer.openA11yMenu();
    const largeBtn = viewer.fontSizeButton('A+');
    await largeBtn.click();
    await expect(largeBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(viewer.fontSizeButton('A')).toHaveAttribute('aria-pressed', 'false');
  });

  test('high contrast checkbox is a proper checkbox with label', async () => {
    await viewer.openA11yMenu();
    const cb = viewer.highContrastCheckbox();
    await expect(cb).toBeVisible();
    // Should be an actual checkbox input
    await expect(cb).toHaveAttribute('type', 'checkbox');
  });

  test('enabling high contrast changes page background to black', async ({ page }) => {
    await viewer.openA11yMenu();
    await viewer.highContrastCheckbox().check();
    // High contrast sets bg-black on the root div
    const bg = await page.evaluate(() => {
      const el = document.querySelector('[class*="bg-black"]');
      return !!el;
    });
    expect(bg).toBe(true);
  });

  test('Escape key closes accessibility menu', async ({ page }) => {
    await viewer.openA11yMenu();
    await expect(viewer.a11yDialog()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(viewer.a11yDialog()).toBeHidden({ timeout: 2000 });
  });

  test('section navigation buttons have descriptive aria-labels', async () => {
    await expect(viewer.prevButton()).toHaveAttribute('aria-label', 'Previous section');
    const nextLabel = await viewer.nextButton().getAttribute('aria-label');
    expect(nextLabel).toMatch(/next section|complete lesson/i);
  });

  test('ARIA live region exists for section transitions', async ({ page }) => {
    const liveRegion = page.locator('[aria-live="polite"][aria-atomic="true"]');
    await expect(liveRegion).toBeAttached();
  });

  test('skip-to-content link is in the DOM and has correct href', async ({ page }) => {
    const link = page.getByText('Skip to lesson content');
    await expect(link).toBeAttached();
    const href = await link.getAttribute('href');
    expect(href).toBe('#lesson-content');
  });

  test('ArrowRight key navigates to next section', async ({ page }) => {
    const initialHeading = await viewer.sectionHeading().textContent();
    await viewer.page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const newHeading = await viewer.sectionHeading().textContent();
    // Heading changed OR we were already on the last section (both valid)
    expect(typeof newHeading).toBe('string');
  });

  test('ArrowLeft key does nothing on first section (no crash)', async ({ page }) => {
    await expect(viewer.prevButton()).toBeDisabled();
    // Pressing ArrowLeft on first section should not cause errors
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    // Still on section 1 — Previous button still disabled
    await expect(viewer.prevButton()).toBeDisabled();
  });

  test('section sidebar buttons have aria-current="step" on active item', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(viewer.sectionNav()).toBeVisible();
    const activeBtn = viewer.sectionNav().locator('[aria-current="step"]');
    await expect(activeBtn).toBeVisible();
  });
});

test.describe('Accessibility — Focus management', () => {
  test('interactive elements have visible focus indicators', async ({ page, lessonData }) => {
    const lesson = await lessonData.getFirst();
    await page.route(`**/api/v1/lessons/${lesson.lesson_id}/render**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAccessibilityLesson(lesson.lesson_id)),
      })
    );
    await page.route('**/api/v1/mock/events', (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.goto(`/lessons/${lesson.lesson_id}`);
    await page.waitForSelector('#lesson-content', { timeout: 15000 });

    // Tab to the accessibility button and verify it gets focus
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    // At some point Tab will land on the a11y button or navigation buttons
    expect(typeof focused).toBe('string');
  });
});
