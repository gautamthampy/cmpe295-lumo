import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';

const mockQuiz = {
  quiz_id: 'quiz-test-1',
  lesson_id: 'test-lesson',
  questions: [
    {
      question_id: 'q1',
      question_text: 'What is 1 + 1?',
      options: [
        { option_id: 'a', option_text: '2', is_distractor: false, misconception_type: null },
        { option_id: 'b', option_text: '3', is_distractor: true, misconception_type: 'off-by-one' },
      ],
    },
    {
      question_id: 'q2',
      question_text: 'What is 2 × 3?',
      options: [
        { option_id: 'a', option_text: '6', is_distractor: false, misconception_type: null },
        { option_id: 'b', option_text: '5', is_distractor: true, misconception_type: 'off-by-one' },
      ],
    },
  ],
};

test.describe('Lesson Quiz flow', () => {
  test.beforeEach(async ({ page, lessonData }) => {
    const lesson = await lessonData.getFirst();
    await page.route(`**/api/v1/lessons/${lesson.lesson_id}/render**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          lesson_id: lesson.lesson_id,
          html_content: '<h2>Lesson</h2><p>Content here.</p>',
          interactive_activities: [],
          misconception_tags: ['test-tag'],
          accessibility_score: 0.9,
          accessibility_issues: [],
          estimated_time_minutes: 5,
          quiz_context: { subject: 'Mathematics', grade_level: 3 },
          next_lesson_id: null,
          prerequisites_met: true,
        }),
      })
    );
    await page.route('**/api/v1/mock/events', (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/api/v1/mock/generate', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockQuiz) })
    );
    await page.goto(`/lessons/${lesson.lesson_id}`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for lesson to load and Start Quiz button to appear
    await page.waitForSelector('#lesson-content', { timeout: 15000 });
    await page.waitForSelector('button:has-text("Start Quiz")', { timeout: 15000 });
  });

  test('"Start Quiz" button is visible after lesson loads', async ({ page }) => {
    await expect(page.getByRole('button', { name: /start quiz/i })).toBeVisible();
  });

  test('clicking "Start Quiz" generates quiz questions', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    // Wait for quiz loading to finish
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Generate quiz for this lesson"]')?.textContent?.includes('Generating'),
      { timeout: 15000 }
    );
    await expect(page.getByText(/quiz —.*questions/i)).toBeVisible({ timeout: 15000 });
  });

  test('quiz questions each show radio button options', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForSelector('input[type="radio"]', { timeout: 15000 });
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();
    expect(count).toBeGreaterThan(0);
  });

  test('"Submit Quiz" button is disabled until all questions answered', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForSelector('input[type="radio"]', { timeout: 15000 });
    const submitBtn = page.getByRole('button', { name: /submit quiz/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submitting quiz shows score', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForSelector('input[type="radio"]', { timeout: 15000 });

    // Answer all questions by selecting the first option in each fieldset
    const fieldsets = page.locator('fieldset');
    const fsCount = await fieldsets.count();
    for (let i = 0; i < fsCount; i++) {
      const firstRadio = fieldsets.nth(i).locator('input[type="radio"]').first();
      await firstRadio.check();
    }

    const submitBtn = page.getByRole('button', { name: /submit quiz/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Score shows as "X / Y correct"
    await expect(page.getByText(/\d+ \/ \d+ correct/i)).toBeVisible({ timeout: 5000 });
  });

  test('after quiz submit, correct answers are highlighted green', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForSelector('input[type="radio"]', { timeout: 15000 });

    const fieldsets = page.locator('fieldset');
    const fsCount = await fieldsets.count();
    for (let i = 0; i < fsCount; i++) {
      const firstRadio = fieldsets.nth(i).locator('input[type="radio"]').first();
      await firstRadio.check();
    }
    await page.getByRole('button', { name: /submit quiz/i }).click();
    await page.waitForSelector('[class*="emerald"]', { timeout: 5000 });
    // At least one emerald (correct) answer highlighted
    const correctAnswers = page.locator('[class*="emerald-50"]');
    expect(await correctAnswers.count()).toBeGreaterThan(0);
  });

  test('quiz result area has aria-live="assertive"', async ({ page }) => {
    await page.getByRole('button', { name: /start quiz/i }).click();
    await page.waitForSelector('input[type="radio"]', { timeout: 15000 });

    const fieldsets = page.locator('fieldset');
    const fsCount = await fieldsets.count();
    for (let i = 0; i < fsCount; i++) {
      await fieldsets.nth(i).locator('input[type="radio"]').first().check();
    }
    await page.getByRole('button', { name: /submit quiz/i }).click();
    await page.waitForSelector('[aria-live="assertive"]', { timeout: 5000 });
    await expect(page.locator('[aria-live="assertive"]:not([id="__next-route-announcer__"])').first()).toBeVisible();
  });
});
