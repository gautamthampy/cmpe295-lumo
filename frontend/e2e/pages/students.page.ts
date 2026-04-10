import { Page } from '@playwright/test';

export class StudentsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/students');
    await this.page.waitForLoadState('domcontentloaded');
  }

  heading() {
    return this.page.getByRole('heading', { name: /my students/i });
  }

  addStudentLink() {
    return this.page.getByRole('link', { name: /\+ add student/i });
  }

  emptyState() {
    return this.page.getByText(/no students yet/i);
  }

  setupProfileLink() {
    return this.page.getByRole('link', { name: /set up a profile/i });
  }

  studentCards() {
    return this.page.locator('.glass-panel').filter({ has: this.page.locator('h2') });
  }

  studentCard(name: string) {
    return this.page.locator('.glass-panel').filter({ hasText: name });
  }

  findGapsButton(name: string) {
    return this.studentCard(name).getByRole('button', { name: /find gaps/i });
  }

  generateLessonLink(name: string) {
    return this.studentCard(name).getByRole('link', { name: /generate lesson/i });
  }

  progressLink(name: string) {
    return this.studentCard(name).getByRole('link', { name: /progress/i });
  }

  loadingText() {
    return this.page.getByText(/loading students/i);
  }

  async waitForLoaded() {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for the loading state to clear
    await this.loadingText().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}
