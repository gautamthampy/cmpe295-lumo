import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

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

async function signInViaUi(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/portal/);
}

async function createStudentViaApi(
  request: APIRequestContext,
  payload: { displayName: string; gradeLevel: number; avatarId?: string; consentGiven?: boolean },
) {
  const response = await request.post(`${API_BASE_URL}/auth/students`, {
    data: {
      avatarId: payload.avatarId ?? "owl",
      consentGiven: payload.consentGiven ?? true,
      displayName: payload.displayName,
      gradeLevel: payload.gradeLevel,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    student_id: string;
    display_name: string;
    grade_level: number;
    avatar_id: string;
  };
}

test.describe("parent button coverage", () => {
  test("public parent auth navigation buttons route correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);

    await expect(page.getByRole("button", { name: /^google$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^apple$/i })).toHaveCount(0);

    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);

    await page.getByRole("link", { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/sign-up/);

    await page.getByRole("link", { name: /lumo: ai study coach/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/forgot-password");
    await page.getByRole("link", { name: /lumo: ai study coach/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-up, verify, forgot-password, and reset-password buttons hit the expected routes and endpoints", async ({ page, request }) => {
    const email = uniqueEmail("parent-button-auth");
    const originalPassword = "Password123";
    const nextPassword = "UpdatedPassword123";

    await page.goto("/sign-up");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/sign-up");
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(originalPassword);
    await page.getByLabel("Confirm Password").fill(originalPassword);
    const signUpResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/sign-up"));
    await page.getByRole("button", { name: /create account/i }).click();
    const signUpResponse = await signUpResponsePromise;
    expect(signUpResponse.status()).toBe(201);

    await expect(page).toHaveURL(new RegExp(`/verify-email\\?email=${encodeURIComponent(email)}`), { timeout: 15000 });

    const resendResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/resend-verification"));
    await page.getByRole("button", { name: /resend verification/i }).click();
    const resendResponse = await resendResponsePromise;
    expect(resendResponse.status()).toBe(200);
    await expect(page.getByText(/new verification/i).or(page.getByText(/if that account exists/i))).toBeVisible();

    await page.getByRole("link", { name: /return to sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    const forgotResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/forgot-password"));
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await page.getByLabel("Email Address").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    const forgotResponse = await forgotResponsePromise;
    expect(forgotResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/forgot-password\/sent\?/);

    await page.getByRole("link", { name: /send another link/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);

    const secondForgotResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/forgot-password"));
    await page.getByLabel("Email Address").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    const secondForgotResponse = await secondForgotResponsePromise;
    expect(secondForgotResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/forgot-password\/sent\?/);
    await page.getByRole("link", { name: /open development reset link/i }).click();
    await expect(page).toHaveURL(/\/reset-password\?token=/);

    const resetUrl = page.url();
    await page.getByRole("link", { name: /back to sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto(resetUrl);
    const resetResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/reset-password"));
    await page.getByLabel("New Password", { exact: true }).fill(nextPassword);
    await page.getByLabel("Confirm New Password", { exact: true }).fill(nextPassword);
    await page.getByRole("button", { name: /save new password/i }).click();
    const resetResponse = await resetResponsePromise;
    expect(resetResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in/);

    const signInResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/sign-in"));
    await page.getByLabel("Email Address").fill(email);
    await page.getByLabel("Password").fill(nextPassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    const signInResponse = await signInResponsePromise;
    expect(signInResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/portal/);
  });

  test("portal dashboard buttons route correctly and story studio opens a preview end to end", async ({ page, request }) => {
    const email = uniqueEmail("portal-buttons");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);

    await signInViaUi(page, email, password);

    await page.getByRole("link", { name: /create a story mission/i }).click();
    await expect(page).toHaveURL(/#story-studio$/);

    await page.getByRole("link", { name: /open learner tools/i }).click();
    await expect(page).toHaveURL(/\/students/);

    await page.getByRole("link", { name: /back to portal/i }).click();
    await expect(page).toHaveURL(/\/portal/);

    await page.getByRole("link", { name: /view all learner settings/i }).click();
    await expect(page).toHaveURL(/\/students/);

    await page.getByRole("link", { name: /back to portal/i }).click();
    await expect(page).toHaveURL(/\/portal/);

    const storyGenerateResponsePromise = page.waitForResponse((response) => response.url().includes("/api/story-studio/generate"));
    await page.getByLabel("Child Name").fill("Ava");
    await page.getByRole("button", { name: /generate story \+ mission/i }).click();
    const storyGenerateResponse = await storyGenerateResponsePromise;
    expect(storyGenerateResponse.status()).toBe(200);

    await expect(page.getByText(/ready to review/i)).toBeVisible();
    await page.getByRole("link", { name: /open student preview/i }).click();
    await expect(page).toHaveURL(/\/lessons\/generated/);
    await expect(page.getByText(/student adventure preview/i)).toBeVisible();

    await page.getByRole("link", { name: /back to portal/i }).click();
    await expect(page).toHaveURL(/\/portal/);
  });

  test("student management buttons create a learner and generate a code end to end", async ({ page, request }) => {
    const email = uniqueEmail("students-buttons");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);

    await signInViaUi(page, email, password);
    await page.locator("header").getByRole("link", { name: /manage learners/i }).click();
    await expect(page).toHaveURL(/\/students/);
    await expect(page.getByText(/no student profiles yet/i)).toBeVisible();

    await page.getByRole("link", { name: /back to portal/i }).click();
    await expect(page).toHaveURL(/\/portal/);

    await page.locator("header").getByRole("link", { name: /manage learners/i }).click();
    await expect(page).toHaveURL(/\/students/);

    const createStudentResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/students"));
    await page.getByLabel("Learner name").fill("Maya");
    await page.getByLabel("Grade level").selectOption("4");
    await page.getByRole("button", { name: /create learner profile/i }).click();
    const createStudentResponse = await createStudentResponsePromise;
    expect(createStudentResponse.status()).toBe(201);

    const student = (await createStudentResponse.json()) as { student_id: string; display_name: string };
    expect(student.student_id).toBeTruthy();
    await expect(page.getByText("Maya")).toBeVisible();

    const generateCodeResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/auth/students/${student.student_id}/login-code`));
    await page.getByRole("button", { name: /generate code for maya/i }).click();
    const generateCodeResponse = await generateCodeResponsePromise;
    expect(generateCodeResponse.status()).toBe(200);

    const generateCodePayload = (await generateCodeResponse.json()) as { loginCode?: string };
    const loginCode = generateCodePayload.loginCode;
    expect(loginCode).toBeTruthy();
    await expect(page.getByText(/visible for 45 seconds/i)).toBeVisible();

    await page.goto("/student-login");
    const verifyCodeResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/student-login/verify-code"));
    for (const [index, digit] of loginCode!.split("").entries()) {
      await page.getByLabel(`Code digit ${index + 1}`).fill(digit);
    }

    const verifyCodeResponse = await verifyCodeResponsePromise;
    expect(verifyCodeResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/learn/);
  });

  test("a verified parent can still create a code for an existing learner from the portal card", async ({ page, request }) => {
    const email = uniqueEmail("portal-code-button");
    const password = "Password123";
    await provisionVerifiedUser(request, email, password);

    await request.post(`${API_BASE_URL}/auth/sign-in`, {
      data: { email, password, rememberMe: false },
    });
    const student = await createStudentViaApi(request, {
      displayName: "Avery",
      gradeLevel: 3,
      avatarId: "otter",
    });

    await signInViaUi(page, email, password);

    const generateCodeResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/auth/students/${student.student_id}/login-code`));
    await page.getByRole("button", { name: /generate code for avery/i }).click();
    const generateCodeResponse = await generateCodeResponsePromise;
    expect(generateCodeResponse.status()).toBe(200);
    await expect(page.getByText(/visible for 45 seconds/i)).toBeVisible();

    const logoutResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/logout"));
    await page.getByRole("button", { name: /sign out/i }).click();
    const logoutResponse = await logoutResponsePromise;
    expect(logoutResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/sign-in/);
  });
});