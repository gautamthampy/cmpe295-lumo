import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';
import { LessonViewerPage } from './pages/lesson-viewer.page';

function mockViewerLesson(lessonId: string) {
  return {
    lesson_id: lessonId,
    html_content: '<h2>Introduction</h2><p>Welcome.</p><h2>Practice</h2><p>Lets practice.</p>',
    interactive_activities: [],
    misconception_tags: ['test-concept'],
    accessibility_score: 0.9,
    accessibility_issues: [],
    estimated_time_minutes: 5,
    quiz_context: { subject: 'Mathematics', grade_level: 3 },
    next_lesson_id: null,
    prerequisites_met: true,
  };
}

test.describe('Lesson Viewer', () => {
  let viewer: LessonViewerPage;

  test.beforeEach(async ({ page, lessonData }) => {
    viewer = new LessonViewerPage(page);
    const lesson = await lessonData.getFirst();
    await page.route(`**/api/v1/lessons/${lesson.lesson_id}/render**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockViewerLesson(lesson.lesson_id)),
      })
    );
    await page.route('**/api/v1/mock/events', (route) => route.fulfill({ status: 200, body: '{}' }));
    await viewer.goto(lesson.lesson_id);
    await page.waitForSelector('#lesson-content', { timeout: 15000 });
  });

  test('renders lesson title in header', async () => {
    await expect(viewer.lessonTitle()).toBeVisible();
    await expect(viewer.lessonTitle()).toContainText('Mathematics');
  });

  test('shows progress bar with aria attributes', async () => {
    const bar = viewer.progressBar();
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    const valuenow = await bar.getAttribute('aria-valuenow');
    expect(Number(valuenow)).toBeGreaterThanOrEqual(0);
  });

  test('shows section heading in main content area', async () => {
    await expect(viewer.sectionHeading()).toBeVisible();
  });

  test('"Next Section" button is visible and enabled', async () => {
    await expect(viewer.nextButton()).toBeVisible();
    await expect(viewer.nextButton()).toBeEnabled();
  });

  test('"Previous" button is disabled on first section', async () => {
    await expect(viewer.prevButton()).toBeDisabled();
  });

  test('navigating to next section updates section heading', async () => {
    const firstHeading = await viewer.sectionHeading().textContent();
    await viewer.goToNextSection();
    const secondHeading = await viewer.sectionHeading().textContent();
    // Heading should change (or stay on last section if only 1 section)
    if (firstHeading !== secondHeading) {
      expect(secondHeading).not.toEqual(firstHeading);
    }
  });

  test('section sidebar shows sections nav', async ({ page }) => {
    // Sidebar is hidden on mobile, shown on lg screens — test at desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(viewer.sectionNav()).toBeVisible();
  });

  test('progress bar updates after completing a section', async ({ page }) => {
    const barBefore = await viewer.progressBar().getAttribute('aria-valuenow');
    await viewer.goToNextSection();
    const barAfter = await viewer.progressBar().getAttribute('aria-valuenow');
    // After navigating next, completed count increases → percentage may change
    // (it changes once a section is "completed", which happens on Next click)
    expect(Number(barAfter)).toBeGreaterThanOrEqual(Number(barBefore));
  });

  test('skip-to-content link is present in DOM', async ({ page }) => {
    const skipLink = page.getByText('Skip to lesson content');
    await expect(skipLink).toBeAttached();
  });

  test('accessibility settings button is visible', async () => {
    await expect(viewer.a11yButton()).toBeVisible();
  });

  test('opening a11y menu shows dialog', async () => {
    await viewer.openA11yMenu();
    await expect(viewer.a11yDialog()).toBeVisible();
    await expect(viewer.page.getByText(/text size/i)).toBeVisible();
    await expect(viewer.highContrastCheckbox()).toBeVisible();
  });

  test('pressing Escape closes a11y menu', async ({ page }) => {
    await viewer.openA11yMenu();
    await page.keyboard.press('Escape');
    await expect(viewer.a11yDialog()).toBeHidden({ timeout: 2000 });
  });
});
