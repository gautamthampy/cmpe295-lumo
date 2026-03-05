import { Page } from '@playwright/test';

export class LessonsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/lessons');
    await this.page.waitForLoadState('networkidle');
  }

  heading() {
    return this.page.getByRole('heading', { name: /lesson library/i });
  }

  lessonCards() {
    return this.page.locator('[role="listitem"]').filter({ has: this.page.locator('a.glass-card') });
  }

  lessonLink(title: string) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('link', { name: new RegExp(escaped, 'i') });
  }

  gridButton() {
    return this.page.getByRole('button', { name: /^grid$/i });
  }

  pathButton() {
    return this.page.getByRole('button', { name: /learning path/i });
  }

  loadingStatus() {
    return this.page.getByRole('status');
  }

  errorAlert() {
    return this.page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first();
  }

  emptyState() {
    return this.page.getByText(/no lessons found/i);
  }

  async clickLesson(title: string) {
    await this.lessonLink(title).first().click();
  }

  async switchToPathView() {
    await this.pathButton().click();
  }

  async switchToGridView() {
    await this.gridButton().click();
  }

  async getLessonCount(): Promise<number> {
    return this.lessonCards().count();
  }
}
