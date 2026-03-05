import { Page } from '@playwright/test';

export class LessonViewerPage {
  constructor(private page: Page) {}

  async goto(lessonId: string) {
    await this.page.goto(`/lessons/${lessonId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Header elements
  lessonTitle() {
    return this.page.getByRole('banner').getByRole('heading', { level: 1 });
  }

  progressBar() {
    return this.page.getByRole('progressbar', { name: /lesson progress/i });
  }

  a11yButton() {
    return this.page.getByRole('button', { name: /accessibility settings/i });
  }

  // A11y menu
  a11yDialog() {
    return this.page.getByRole('dialog', { name: /accessibility settings/i });
  }

  fontSizeButton(size: 'A' | 'A+' | 'A++') {
    return this.page.getByRole('button', { name: size, exact: true });
  }

  highContrastCheckbox() {
    return this.page.getByRole('checkbox', { name: /high contrast/i });
  }

  // Section navigation sidebar
  sectionNav() {
    return this.page.getByRole('navigation', { name: /lesson sections/i });
  }

  sectionButtons() {
    return this.sectionNav().getByRole('button');
  }

  activeSectionButton() {
    return this.sectionNav().getByRole('button', { exact: false }).filter({
      has: this.page.locator('[aria-current="step"]'),
    });
  }

  // Main content
  mainContent() {
    return this.page.locator('#lesson-content');
  }

  sectionHeading() {
    return this.mainContent().getByRole('heading', { level: 2 });
  }

  nextButton() {
    return this.page.getByRole('button', { name: /next section|complete lesson/i });
  }

  prevButton() {
    return this.page.getByRole('button', { name: /previous section/i });
  }

  skipLink() {
    return this.page.getByText(/skip to lesson content/i);
  }

  // Interactive blocks
  interactiveBlocks() {
    return this.page.locator('[role="group"]').filter({ has: this.page.locator('[class*="glass"]') });
  }

  // Quiz area
  startQuizButton() {
    return this.page.getByRole('button', { name: /start quiz|take quiz/i });
  }

  nextLessonLink() {
    return this.page.getByRole('link', { name: /next lesson/i });
  }

  // Actions
  async openA11yMenu() {
    await this.a11yButton().click();
    await this.a11yDialog().waitFor({ state: 'visible' });
  }

  async closeA11yMenuWithEscape() {
    await this.page.keyboard.press('Escape');
    await this.a11yDialog().waitFor({ state: 'hidden' });
  }

  async setFontSize(size: 'A' | 'A+' | 'A++') {
    await this.openA11yMenu();
    await this.fontSizeButton(size).click();
  }

  async enableHighContrast() {
    await this.openA11yMenu();
    await this.highContrastCheckbox().check();
  }

  async goToNextSection() {
    await this.nextButton().click();
  }

  async goToPrevSection() {
    await this.prevButton().click();
  }

  async navigateWithArrowRight() {
    await this.page.keyboard.press('ArrowRight');
  }

  async navigateWithArrowLeft() {
    await this.page.keyboard.press('ArrowLeft');
  }

  getProgressPct() {
    return this.progressBar().getAttribute('aria-valuenow');
  }
}
