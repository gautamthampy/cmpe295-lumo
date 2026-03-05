import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  heading() {
    return this.page.getByRole('heading', { name: /parent sign in/i });
  }

  logo() {
    return this.page.getByText('LUMO');
  }

  emailInput() {
    return this.page.locator('#email');
  }

  passwordInput() {
    return this.page.locator('#password');
  }

  submitButton() {
    return this.page.getByRole('button', { name: /sign in/i });
  }

  errorAlert() {
    return this.page.locator('[role="alert"]');
  }

  registerLink() {
    return this.page.getByRole('link', { name: /create an account/i });
  }

  studentLoginLink() {
    return this.page.getByRole('link', { name: /student sign in/i });
  }

  demoHint() {
    return this.page.getByText(/demo@lumo\.app/);
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
  }

  async submit() {
    await this.submitButton().click();
  }

  async loginAs(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }
}
