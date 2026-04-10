import { Page } from '@playwright/test';

export class StudentLoginPage {
  constructor(readonly page: Page) {}

  async goto() {
    await this.page.goto('/student-login');
    await this.page.waitForLoadState('domcontentloaded');
  }

  heading() {
    return this.page.getByRole('heading', { name: /ask your parent for help/i });
  }

  emailInput() {
    return this.page.getByPlaceholder(/parent's email address/i);
  }

  sendCodeButton() {
    return this.page.getByRole('button', { name: /send my code/i });
  }

  resendButton() {
    return this.page.getByRole('button', { name: /didn't get the code\? send it again/i });
  }

  codeDigit(position: number) {
    return this.page.getByLabel(`Code digit ${position}`);
  }

  errorAlert() {
    return this.page.locator('[role="alert"]').filter({ hasText: /student login code|invalid|expired/i }).first();
  }

  messagePanel() {
    return this.page.locator('div').filter({ hasText: /development code|choose who is learning today|student sign-in code/i }).first();
  }

  studentChoice(displayName: string) {
    return this.page.getByRole('button', { name: new RegExp(displayName, 'i') });
  }

  learnGreeting() {
    return this.page.getByRole('heading', { name: /hi,/i });
  }

  async requestCode(email: string) {
    await this.emailInput().fill(email);
    await this.sendCodeButton().click();
  }

  async enterCode(code: string) {
    await this.codeDigit(1).click();
    await this.page.keyboard.type(code);
  }

  async chooseStudent(displayName: string) {
    await this.studentChoice(displayName).click();
  }

  async requestAndEnterCode(email: string, code: string) {
    await this.requestCode(email);
    await this.enterCode(code);
  }
}
