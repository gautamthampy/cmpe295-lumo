import { Page } from '@playwright/test';

export class EditorPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/lessons/editor');
    await this.page.waitForLoadState('domcontentloaded');
  }

  heading() {
    return this.page.getByRole('heading', { name: /lesson editor/i });
  }

  topicInput() {
    return this.page.locator('#topic-input');
  }

  gradeSelect() {
    return this.page.locator('#grade-input');
  }

  generateButton() {
    return this.page.getByRole('button', { name: /generate.*ai/i });
  }

  saveDraftButton() {
    return this.page.getByRole('button', { name: /save draft/i });
  }

  publishButton() {
    return this.page.getByRole('button', { name: /publish lesson/i });
  }

  errorAlert() {
    return this.page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first();
  }

  successStatus() {
    return this.page.locator('span[role="status"]');
  }

  a11yScore() {
    return this.page.getByText(/a11y score/i);
  }

  mdxTextarea() {
    return this.page.getByRole('textbox').or(this.page.locator('textarea')).first();
  }

  previewPanel() {
    return this.page.locator('[class*="prose"]').first();
  }

  insertTemplateButton(label: string) {
    return this.page.getByRole('button', { name: new RegExp(`Insert ${label} activity template`, 'i') });
  }

  async setTopic(topic: string) {
    await this.topicInput().fill(topic);
  }

  async setGrade(grade: number) {
    await this.gradeSelect().selectOption(String(grade));
  }

  async generate() {
    await this.generateButton().click();
    // Wait for generating state to end
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('[aria-label="Generate lesson content using AI"]');
      return btn && !btn.textContent?.includes('Generating');
    }, { timeout: 30000 });
  }

  async saveDraft() {
    await this.saveDraftButton().click();
  }

  async publish() {
    await this.publishButton().click();
  }

  async insertTemplate(label: string) {
    await this.insertTemplateButton(label).click();
  }

  async waitForPreview() {
    // Preview is updated via debounced POST /lessons/preview
    await this.page.waitForTimeout(1200);
    await this.page.waitForLoadState('domcontentloaded');
  }
}
