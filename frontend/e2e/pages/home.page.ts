import { Page } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  heading() {
    return this.page.getByRole('heading', { name: /welcome back/i });
  }

  continueSection() {
    return this.page.getByRole('heading', { name: /continue learning/i });
  }

  viewAllLink() {
    return this.page.getByRole('link', { name: /view all/i });
  }

  startLearningButton() {
    return this.page.getByRole('link', { name: /start learning/i });
  }

  createLessonButton() {
    return this.page.getByRole('link', { name: /create a lesson/i });
  }

  lessonCards() {
    return this.page.locator('.glass-card');
  }

  statCards() {
    return this.page.locator('[class*="rounded-"][class*="border-2"]').filter({ hasText: /lessons|completed|score/i });
  }

  async clickViewAll() {
    await this.viewAllLink().click();
  }

  async clickStartLearning() {
    await this.startLearningButton().click();
  }

  async clickCreateLesson() {
    await this.createLessonButton().click();
  }
}
