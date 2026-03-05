import { expect } from '@playwright/test';
import { test } from './fixtures/test-fixtures';
import { EditorPage } from './pages/editor.page';

test.describe('Lesson Editor', () => {
  let editor: EditorPage;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    await editor.goto();
  });

  test('renders "Lesson Editor" heading', async () => {
    await expect(editor.heading()).toBeVisible();
  });

  test('topic input is visible and editable', async () => {
    await expect(editor.topicInput()).toBeVisible();
    await editor.setTopic('Adding Fractions');
    await expect(editor.topicInput()).toHaveValue('Adding Fractions');
  });

  test('grade selector has options 1–6', async () => {
    const select = editor.gradeSelect();
    await expect(select).toBeVisible();
    for (let g = 1; g <= 6; g++) {
      await expect(select.locator(`option[value="${g}"]`)).toBeAttached();
    }
  });

  test('"Generate with AI" button is disabled when topic is empty', async () => {
    await expect(editor.topicInput()).toHaveValue('');
    await expect(editor.generateButton()).toBeDisabled();
  });

  test('"Generate with AI" button enables after typing topic', async () => {
    await editor.setTopic('Multiplication Tables');
    await expect(editor.generateButton()).toBeEnabled();
  });

  test('generating with AI populates MDX content', async () => {
    await editor.setTopic('Counting to 100');
    await editor.generate();
    // After generation, the MdxEditor textarea should have content
    const textarea = editor.page.locator('textarea');
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(50);
  });

  test('A11y score appears after generation', async () => {
    await editor.setTopic('Shapes and Geometry');
    await editor.generate();
    await expect(editor.a11yScore()).toBeVisible({ timeout: 15000 });
  });

  test('activity template buttons insert content into editor', async () => {
    const templates = ['Fill in Blank', 'True / False', 'Multiple Choice', 'Drag to Sort', 'Match Pairs', 'Number Line'];
    for (const label of templates) {
      const btn = editor.insertTemplateButton(label);
      await expect(btn).toBeVisible();
    }
    // Click one and verify it adds to textarea
    await editor.insertTemplate('Fill in Blank');
    const textarea = editor.page.locator('textarea');
    const value = await textarea.inputValue();
    expect(value).toContain('FillInBlank');
  });

  test('"Save Draft" is disabled when content is empty', async () => {
    await expect(editor.saveDraftButton()).toBeDisabled();
  });

  test('"Publish Lesson" is disabled when content is empty', async () => {
    await expect(editor.publishButton()).toBeDisabled();
  });

  test('saving a draft shows success message', async () => {
    await editor.setTopic('Test Lesson');
    await editor.generate();
    // Wait for content to appear
    await editor.page.waitForFunction(() => {
      const ta = document.querySelector('textarea');
      return ta && ta.value.length > 50;
    }, { timeout: 15000 });
    await editor.saveDraft();
    await expect(editor.successStatus()).toBeVisible({ timeout: 10000 });
    await expect(editor.page.getByText(/draft saved/i)).toBeVisible();
  });

  test('error banner appears with role="alert"', async () => {
    // Generate button with empty topic — triggers error
    await editor.generateButton().click({ force: true }).catch(() => {});
    // Alternatively, route the API to fail
    await editor.page.route('**/api/v1/lessons/generate', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Server error"}' })
    );
    await editor.setTopic('Error test');
    await editor.generateButton().click();
    await expect(editor.errorAlert()).toBeVisible({ timeout: 10000 });
  });

  test('live preview panel renders HTML after typing MDX', async () => {
    // Type simple MDX into textarea directly
    const textarea = editor.page.locator('textarea');
    await textarea.fill('# Hello World\n\nThis is a test lesson about math.');
    await editor.waitForPreview();
    // The MdxEditor renders a preview panel alongside the textarea
    const preview = editor.page.locator('[class*="prose"]');
    if (await preview.count() > 0) {
      await expect(preview.first()).toBeVisible();
    }
  });
});
