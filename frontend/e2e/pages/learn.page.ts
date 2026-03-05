import { Page } from '@playwright/test';

export class LearnPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/learn');
    await this.page.waitForLoadState('domcontentloaded');
  }

  greeting() {
    return this.page.getByRole('heading', { name: /hi,/i });
  }

  tagline() {
    return this.page.getByText(/what do you want to learn today/i);
  }

  subjectsHeading() {
    return this.page.getByRole('heading', { name: /your subjects/i });
  }

  subjectButton(name: string) {
    return this.page.getByRole('button', { name: new RegExp(name, 'i') });
  }

  lessonsHeading() {
    return this.page.getByRole('heading', { name: /ready to explore|no lessons yet/i });
  }

  lessonLinks() {
    return this.page.locator('a[href*="/lessons/"]');
  }

  signOutButton() {
    return this.page.getByRole('button', { name: /sign out/i });
  }

  loadingText() {
    return this.page.getByText(/loading your lessons/i);
  }

  async waitForLoaded() {
    await this.loadingText().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded');
  }
}
