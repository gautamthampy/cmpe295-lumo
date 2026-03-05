import { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  logo() {
    return this.page.getByText('LUMO').first();
  }

  stepIndicator(step: 1 | 2 | 3) {
    return this.page.locator(`div.rounded-full`).filter({ hasText: String(step) }).first();
  }

  // Step 1 selectors
  step1Heading() {
    return this.page.getByRole('heading', { name: /create your account/i });
  }

  parentNameInput() {
    return this.page.getByPlaceholder('Jane Smith');
  }

  emailInput() {
    return this.page.getByPlaceholder('you@email.com');
  }

  passwordInput() {
    return this.page.getByPlaceholder(/at least 8 characters/i);
  }

  continueButton() {
    return this.page.getByRole('button', { name: /continue/i });
  }

  // Step 2 selectors
  step2Heading() {
    return this.page.getByRole('heading', { name: /add your child/i });
  }

  childNameInput() {
    return this.page.getByPlaceholder('Alex');
  }

  gradeLevelSelect() {
    return this.page.locator('select').filter({ has: this.page.locator('option[value="3"]') });
  }

  pinInput() {
    return this.page.getByPlaceholder('• • • •');
  }

  avatarRadio(avatarId: string) {
    return this.page.locator(`input[type="radio"][value="${avatarId}"]`);
  }

  consentCheckbox() {
    return this.page.locator('input[type="checkbox"]');
  }

  // Step 3 selectors
  step3Heading() {
    return this.page.getByRole('heading', { name: /what does .+ study/i });
  }

  subjectCheckbox(name: string) {
    return this.page.getByText(name).locator('..').locator('input[type="checkbox"]');
  }

  letsGoButton() {
    return this.page.getByRole('button', { name: /let's go/i });
  }

  skipButton() {
    return this.page.getByRole('button', { name: /skip for now/i });
  }

  errorAlert() {
    return this.page.locator('[role="alert"]');
  }

  signInLink() {
    return this.page.getByRole('link', { name: /sign in/i });
  }

  async fillStep1(name: string, email: string, password: string) {
    await this.parentNameInput().fill(name);
    await this.emailInput().fill(email);
    await this.passwordInput().fill(password);
    await this.continueButton().click();
  }

  async fillStep2(childName: string, pin: string) {
    await this.childNameInput().fill(childName);
    await this.pinInput().fill(pin);
    await this.consentCheckbox().check();
    await this.continueButton().click();
  }
}
