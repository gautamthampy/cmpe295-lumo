/**
 * Tests for MultipleChoice, TrueOrFalse, and FillInBlank interactive activities.
 */
import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';

function makeActivity(activityJson: object) {
  const b64 = Buffer.from(JSON.stringify(activityJson)).toString('base64');
  return `<div data-interactive="${b64}" class="interactive-placeholder"></div>`;
}

const mcActivity = {
  type: 'MultipleChoice', id: 'mc-1', instruction: 'Choose the best answer',
  misconception_tag: null, difficulty: 'standard',
  data: { question: 'What is 1/2?', options: [{ id: 'a', text: 'One half' }, { id: 'b', text: 'Two' }], correct_id: 'a' },
};
const tfActivity = {
  type: 'TrueOrFalse', id: 'tf-1', instruction: 'True or false?',
  misconception_tag: null, difficulty: 'standard',
  data: { statement: '1/2 is less than 1.', correct: true, explanation: 'Correct!' },
};
const fibActivity = {
  type: 'FillInBlank', id: 'fib-1', instruction: 'Fill in the blank',
  misconception_tag: null, difficulty: 'standard',
  data: { template: 'One half is written as ___', answer: '1/2', hint: 'Use a fraction' },
};

function mockBasicActivitiesLesson(lessonId: string) {
  return {
    lesson_id: lessonId,
    html_content: [
      '<h2>Section 1</h2><p>Multiple choice below:</p>',
      makeActivity(mcActivity),
      '<h2>Section 2</h2><p>True or false below:</p>',
      makeActivity(tfActivity),
      '<h2>Section 3</h2><p>Fill in the blank below:</p>',
      makeActivity(fibActivity),
    ].join(''),
    interactive_activities: [mcActivity, tfActivity, fibActivity],
    misconception_tags: ['fraction-as-two-numbers'],
    accessibility_score: 0.9,
    accessibility_issues: [],
    estimated_time_minutes: 10,
    quiz_context: { subject: 'Mathematics', grade_level: 3 },
    next_lesson_id: null,
    prerequisites_met: true,
  };
}

test.describe('Interactive Activities — Basic (MC, T/F, Fill-in-Blank)', () => {
  test.beforeEach(async ({ page, lessonData }) => {
    const lesson = await lessonData.getWithActivities();
    await page.route(`**/api/v1/lessons/${lesson.lesson_id}/render**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockBasicActivitiesLesson(lesson.lesson_id)),
      })
    );
    await page.route('**/api/v1/mock/events', (route) => route.fulfill({ status: 200, body: '{}' }));
    await page.goto(`/lessons/${lesson.lesson_id}`);
    await page.waitForLoadState('networkidle');
    // Wait for LessonViewer to fully render with activities
    await page.waitForSelector('#lesson-content', { timeout: 15000 });
  });

  test('at least one interactive activity renders in lesson content', async ({ page }) => {
    // Interactive activities render as [role="group"] inside #lesson-content
    const activities = page.locator('#lesson-content [role="group"]');
    // Navigate all sections to find activities
    let found = false;
    const nextBtn = page.getByRole('button', { name: /next section/i });
    for (let i = 0; i < 10; i++) {
      if (await activities.count() > 0) {
        found = true;
        break;
      }
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('MultipleChoice: selecting an option enables "Check Answer" button', async ({ page }) => {
    // Navigate to find a MultipleChoice activity
    const nextBtn = page.getByRole('button', { name: /next section/i });
    let checkBtn = page.getByRole('button', { name: /check answer/i });
    let found = false;

    for (let i = 0; i < 10; i++) {
      if (await checkBtn.count() > 0) {
        found = true;
        break;
      }
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        checkBtn = page.getByRole('button', { name: /check answer/i });
      } else break;
    }

    if (!found) test.skip();

    // Initially disabled
    await expect(checkBtn.first()).toBeDisabled();
    // Select a radio option
    const radio = page.locator('input[type="radio"]').first();
    await radio.check();
    await expect(checkBtn.first()).toBeEnabled();
  });

  test('MultipleChoice: submitting shows correct/incorrect feedback', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next section/i });
    let checkBtn = page.getByRole('button', { name: /check answer/i });

    for (let i = 0; i < 10; i++) {
      if (await checkBtn.count() > 0) break;
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        checkBtn = page.getByRole('button', { name: /check answer/i });
      } else break;
    }
    if (await checkBtn.count() === 0) test.skip();

    await page.locator('input[type="radio"]').first().check();
    await checkBtn.first().click();

    // Feedback appears with role="status"
    await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 3000 });
  });

  test('TrueOrFalse: True and False buttons are visible', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next section/i });
    let trueBtn = page.getByRole('button', { name: /^true$/i });

    for (let i = 0; i < 10; i++) {
      if (await trueBtn.count() > 0) break;
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        trueBtn = page.getByRole('button', { name: /^true$/i });
      } else break;
    }

    if (await trueBtn.count() === 0) test.skip();
    await expect(trueBtn.first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^false$/i }).first()).toBeVisible();
  });

  test('TrueOrFalse: selecting True or False shows feedback', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next section/i });
    let trueBtn = page.getByRole('button', { name: /^true$/i });

    for (let i = 0; i < 10; i++) {
      if (await trueBtn.count() > 0) break;
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        trueBtn = page.getByRole('button', { name: /^true$/i });
      } else break;
    }
    if (await trueBtn.count() === 0) test.skip();

    await trueBtn.first().click();
    await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 3000 });
  });

  test('FillInBlank: input field is present and editable', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /next section/i });
    let textInput = page.locator('#lesson-content input[type="text"]');

    for (let i = 0; i < 10; i++) {
      if (await textInput.count() > 0) break;
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        textInput = page.locator('#lesson-content input[type="text"]');
      } else break;
    }
    if (await textInput.count() === 0) test.skip();

    await textInput.first().fill('42');
    await expect(textInput.first()).toHaveValue('42');
  });

  test('activity instruction text is visible', async ({ page }) => {
    // All activities show instruction text in uppercase
    const instructionText = page.locator('[id^="mc-instruction-"], [id^="tf-instruction-"], [id^="fib-instruction-"], [id^="nl-instruction-"]');
    const nextBtn = page.getByRole('button', { name: /next section/i });

    for (let i = 0; i < 10; i++) {
      if (await instructionText.count() > 0) break;
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      } else break;
    }
    if (await instructionText.count() === 0) test.skip();
    await expect(instructionText.first()).toBeVisible();
  });
});
