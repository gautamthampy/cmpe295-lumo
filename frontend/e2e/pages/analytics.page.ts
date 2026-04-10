import { Page } from '@playwright/test';

export class AnalyticsPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/lessons/analytics');
    await this.page.waitForLoadState('domcontentloaded');
  }

  heading() {
    return this.page.getByRole('heading', { name: /analytics dashboard/i });
  }

  loadingStatus() {
    return this.page.getByRole('status');
  }

  errorAlert() {
    return this.page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first();
  }

  summaryCards() {
    return this.page.locator('text=/active lessons|avg a11y|avg quiz/i').locator('..');
  }

  totalLessonsValue() {
    return this.page.getByText(/active lessons/i).locator('..').locator('p').first();
  }

  lessonMetricList() {
    return this.page.getByRole('list', { name: /lesson metrics/i });
  }

  lessonMetricItems() {
    return this.lessonMetricList().getByRole('listitem');
  }

  scoreBadges() {
    return this.page.locator('span').filter({ hasText: /\d+%/ });
  }

  backLink() {
    return this.page.getByRole('link', { name: /back/i });
  }
}
