import { Page } from '@playwright/test';

export class StudentLoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/student-login');
    await this.page.waitForLoadState('networkidle');
  }

  heading() {
    return this.page.getByText(/who's learning today/i);
  }

  logo() {
    return this.page.getByText('LUMO').first();
  }

  // Avatar grid (student selection)
  studentButton(displayName: string) {
    return this.page.getByRole('button', { name: new RegExp(`login as ${displayName}`, 'i') });
  }

  noStudentsMessage() {
    return this.page.getByText(/no student profiles yet/i);
  }

  // PIN pad selectors
  pinDots() {
    return this.page.locator('[role="group"][aria-label="PIN entry"]');
  }

  digitButton(digit: number) {
    return this.page.getByRole('button', { name: `Digit ${digit}` });
  }

  backButton() {
    return this.page.getByRole('button', { name: /go back/i });
  }

  backspaceButton() {
    return this.page.getByRole('button', { name: /delete last digit/i });
  }

  errorAlert() {
    return this.page.locator('[role="alert"]');
  }

  signingInMessage() {
    return this.page.getByText(/signing in/i);
  }

  async selectStudent(displayName: string) {
    await this.studentButton(displayName).click();
  }

  async enterPin(pin: string) {
    for (const digit of pin) {
      await this.digitButton(Number(digit)).click();
    }
  }

  async loginAs(displayName: string, pin: string) {
    await this.selectStudent(displayName);
    await this.enterPin(pin);
    // Page auto-submits after 4 digits
  }
}
