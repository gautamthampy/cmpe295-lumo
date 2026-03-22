import { expect, test, type APIRequestContext } from "@playwright/test";

const API_BASE_URL = "http://127.0.0.1:8100/api/v1";

function uniqueEmail(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function provisionVerifiedUser(request: APIRequestContext, email: string, password: string) {
  const signUpResponse = await request.post(`${API_BASE_URL}/auth/sign-up`, {
    data: { email, password },
  });
  expect(signUpResponse.ok()).toBeTruthy();

  const signUpPayload = (await signUpResponse.json()) as { verificationToken?: string };
  expect(signUpPayload.verificationToken).toBeTruthy();

  const verifyResponse = await request.post(`${API_BASE_URL}/auth/verify-email`, {
    data: { token: signUpPayload.verificationToken },
  });
  expect(verifyResponse.ok()).toBeTruthy();
}

async function signInViaApi(request: APIRequestContext, email: string, password: string) {
  const response = await request.post(`${API_BASE_URL}/auth/sign-in`, {
    data: { email, password, rememberMe: false },
  });
  expect(response.ok()).toBeTruthy();
}

async function createStudentViaApi(
  request: APIRequestContext,
  payload: { displayName: string; gradeLevel: number; avatarId?: string; consentGiven?: boolean },
) {
  const response = await request.post(`${API_BASE_URL}/auth/students`, {
    data: {
      avatarId: payload.avatarId ?? 'owl',
      consentGiven: payload.consentGiven ?? true,
      displayName: payload.displayName,
      gradeLevel: payload.gradeLevel,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { student_id: string; display_name: string; grade_level: number; avatar_id: string };
}

test.describe("auth session smoke", () => {
  test("unauthenticated portal requests redirect to sign-in", async ({ page }) => {
    await page.goto("/portal");

    await expect(page).toHaveURL(/\/sign-in\?next=%2Fportal/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("verified parent can sign in, reach the protected portal, and log out", async ({ page, request }) => {
    const email = uniqueEmail("portal");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);

    await page.goto("/sign-in");
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByRole("heading", { name: /parent portal session active/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: email })).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/portal");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fportal/);
  });

  test("forgot-password and reset-password flow rotates credentials end to end", async ({ page, request }) => {
    const email = uniqueEmail("reset");
    const originalPassword = "Password123";
    const nextPassword = "UpdatedPassword123";
    await provisionVerifiedUser(request, email, originalPassword);

    await page.goto("/forgot-password");
    await page.getByLabel("Email Address").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();

    await expect(page).toHaveURL(/\/forgot-password\/sent\?/);
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();

    await page.getByRole("link", { name: /open development reset link/i }).click();
    await expect(page).toHaveURL(/\/reset-password\?token=/);

    await page.getByLabel("New Password", { exact: true }).fill(nextPassword);
    await page.getByLabel("Confirm New Password", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: /save new password/i }).click();

    await expect(page.getByText(/password updated\. sign in with your new password\./i)).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(originalPassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    await page.getByLabel("Password").fill(nextPassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/portal/);
  });

  test("student login with a parent-email code works end to end for a multi-student household", async ({ page, request }) => {
    const email = uniqueEmail("student-code");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);
    await signInViaApi(request, email, password);
    await createStudentViaApi(request, { displayName: 'Alex', gradeLevel: 3, avatarId: 'owl' });
    await createStudentViaApi(request, { displayName: 'Sam', gradeLevel: 4, avatarId: 'fox' });

    await page.goto('/student-login');
    await page.getByPlaceholder(/parent's email address/i).fill(email);
    const requestCodeResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/auth/student-login/request-code'));
    await page.getByRole('button', { name: /send my code/i }).click();

    const requestCodeResponse = await requestCodeResponsePromise;
    const requestCodePayload = (await requestCodeResponse.json()) as { loginCode?: string };
    const loginCode = requestCodePayload.loginCode;
    expect(loginCode).toBeTruthy();

    const digits = loginCode!.split('');
    for (const [index, digit] of digits.entries()) {
      await page.getByLabel(`Code digit ${index + 1}`).fill(digit);
    }

    await expect(page.getByText(/choose who is learning today/i)).toBeVisible();
    await page.getByRole('button', { name: /sam/i }).click();

    await expect(page).toHaveURL(/\/learn/);
    await expect(page.getByRole('heading', { name: /hi, sam!/i })).toBeVisible();
  });

  test("parent dashboard can generate a child-specific code that signs the student in", async ({ page, request }) => {
    const email = uniqueEmail("portal-student-code");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);
    await signInViaApi(request, email, password);
    const student = await createStudentViaApi(request, { displayName: 'Avery', gradeLevel: 3, avatarId: 'otter' });

    await page.goto('/sign-in');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/portal/);

    await page.getByRole('link', { name: /manage student access/i }).click();
    await expect(page).toHaveURL(/\/students/);
    await expect(page.getByRole('heading', { name: /student sign-in codes/i })).toBeVisible();

    const generateCodeResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/auth/students/${student.student_id}/login-code`));
    await page.getByRole('button', { name: /generate code for avery/i }).click();
    await expect(page.getByText(/visible for 45 seconds/i)).toBeVisible();

    const generateCodeResponse = await generateCodeResponsePromise;
    const generateCodePayload = (await generateCodeResponse.json()) as { loginCode?: string };
    const loginCode = generateCodePayload.loginCode;
    expect(loginCode).toBeTruthy();

    await page.goto('/student-login');
    const digits = loginCode!.split('');
    for (const [index, digit] of digits.entries()) {
      await page.getByLabel(`Code digit ${index + 1}`).fill(digit);
    }

    await expect(page).toHaveURL(/\/learn/);
    await expect(page.getByRole('heading', { name: /hi, avery!/i })).toBeVisible();
    await expect(student.student_id).toBeTruthy();
  });
});