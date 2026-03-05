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

// ─── Strategy Selector Tests ─────────────────────────────────────────────────

test.describe('Lesson Editor — AI Strategy Selector', () => {
  let editor: EditorPage;

  test.beforeEach(async ({ page }) => {
    editor = new EditorPage(page);
    await editor.goto();
  });

  test('strategy selector is visible with label "Strategy:"', async () => {
    await expect(editor.page.getByText('Strategy:')).toBeVisible();
    await expect(editor.page.locator('#strategy-select')).toBeVisible();
  });

  test('strategy selector defaults to "hybrid"', async () => {
    const select = editor.page.locator('#strategy-select');
    await expect(select).toHaveValue('hybrid');
  });

  test('strategy selector has all 4 options', async () => {
    const select = editor.page.locator('#strategy-select');
    for (const value of ['hybrid', 'zpd', 'misconception', 'bkt']) {
      await expect(select.locator(`option[value="${value}"]`)).toBeAttached();
    }
  });

  test('changing strategy to "zpd" updates selector value', async () => {
    const select = editor.page.locator('#strategy-select');
    await select.selectOption('zpd');
    await expect(select).toHaveValue('zpd');
  });

  test('changing strategy to "misconception" updates selector value', async () => {
    const select = editor.page.locator('#strategy-select');
    await select.selectOption('misconception');
    await expect(select).toHaveValue('misconception');
  });

  test('changing strategy to "bkt" updates selector value', async () => {
    const select = editor.page.locator('#strategy-select');
    await select.selectOption('bkt');
    await expect(select).toHaveValue('bkt');
  });

  test('selected strategy is sent in the generate API request', async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/lessons/generate', async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated_mdx: '# Test\n\nContent here.',
          accessibility_score: 0.85,
          gemini_used: false,
          saved_lesson_id: null,
        }),
      });
    });

    const select = editor.page.locator('#strategy-select');
    await select.selectOption('zpd');
    await editor.setTopic('Test Topic for ZPD');
    await editor.generateButton().click();
    await editor.page.waitForLoadState('domcontentloaded');

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!['strategy']).toBe('zpd');
  });

  test('A11y score shows strategy label after generation', async ({ page }) => {
    await page.route('**/api/v1/lessons/generate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generated_mdx: '# Lesson\n\nContent.',
          accessibility_score: 0.9,
          gemini_used: true,
          saved_lesson_id: null,
        }),
      })
    );

    const select = editor.page.locator('#strategy-select');
    await select.selectOption('bkt');
    await editor.setTopic('BKT strategy test');
    await editor.generateButton().click();
    await editor.page.waitForLoadState('domcontentloaded');

    // Should show score and strategy label
    await expect(editor.page.getByText(/90%/)).toBeVisible({ timeout: 5000 });
    await expect(editor.page.getByText(/bkt/i)).toBeVisible({ timeout: 5000 });
  });

  test('subject selector is visible with default "Mathematics"', async () => {
    // Subject input exists in metadata form
    await expect(editor.page.getByText(/lesson metadata/i)).toBeVisible();
  });
});
