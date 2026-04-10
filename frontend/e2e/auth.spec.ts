/**
 * Auth flow e2e tests — parent login, registration wizard, student code login.
 * All API calls are intercepted so these tests run without a live backend.
 */
import { test, expect, DEMO_STUDENTS, DEMO_SUBJECTS } from './fixtures/test-fixtures';
import { LoginPage } from './pages/login.page';
import { RegisterPage } from './pages/register.page';
import { StudentLoginPage } from './pages/student-login.page';

// ─── Parent Login ────────────────────────────────────────────────────────────

test.describe('Parent Login (/login)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('renders LUMO logo and "Parent Sign In" heading', async () => {
    await expect(loginPage.logo()).toBeVisible();
    await expect(loginPage.heading()).toBeVisible();
  });

  test('shows email and password inputs', async () => {
    await expect(loginPage.emailInput()).toBeVisible();
    await expect(loginPage.passwordInput()).toBeVisible();
  });

  test('shows demo credentials hint', async () => {
    await expect(loginPage.demoHint()).toBeVisible();
  });

  test('has link to /register', async ({ page }) => {
    await loginPage.registerLink().click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('has link to /student-login', async ({ page }) => {
    await loginPage.studentLoginLink().click();
    await expect(page).toHaveURL(/\/student-login/);
  });

  test('successful login redirects to dashboard', async ({ page, authMocks }) => {
    await authMocks.mockParentLogin(page);
    await loginPage.loginAs('demo@lumo.app', 'demo1234');
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('failed login shows error alert', async ({ page, authMocks }) => {
    await authMocks.mockParentLoginFail(page);
    await loginPage.loginAs('wrong@email.com', 'badpass');
    await expect(loginPage.errorAlert()).toBeVisible({ timeout: 5000 });
    await expect(loginPage.errorAlert()).toContainText(/invalid credentials/i);
  });

  test('submit button shows loading state while signing in', async ({ page, authMocks }) => {
    // Delay the response so we can see the loading state
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }),
      });
    });
    await loginPage.fillCredentials('demo@lumo.app', 'demo1234');
    await loginPage.submit();
    await expect(loginPage.submitButton()).toContainText(/signing in/i);
  });

  test('network error shows generic error message', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) => route.abort());
    await loginPage.loginAs('demo@lumo.app', 'demo1234');
    await expect(loginPage.errorAlert()).toBeVisible({ timeout: 5000 });
    await expect(loginPage.errorAlert()).toContainText(/login failed/i);
  });
});

// ─── Registration Wizard ─────────────────────────────────────────────────────

test.describe('Registration Wizard (/register)', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page, authMocks }) => {
    await authMocks.mockSubjects(page);
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('renders LUMO logo and step 1 heading', async () => {
    await expect(registerPage.logo()).toBeVisible();
    await expect(registerPage.step1Heading()).toBeVisible();
  });

  test('step indicator shows 3 steps', async ({ page }) => {
    for (const s of [1, 2, 3] as const) {
      await expect(registerPage.stepIndicator(s)).toBeVisible();
    }
  });

  test('step 1 has name, email, and password fields', async () => {
    await expect(registerPage.parentNameInput()).toBeVisible();
    await expect(registerPage.emailInput()).toBeVisible();
    await expect(registerPage.passwordInput()).toBeVisible();
  });

  test('has link back to /login', async ({ page }) => {
    await registerPage.signInLink().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('step 1 — successful submission advances to step 2', async ({ page, authMocks }) => {
    await authMocks.mockParentLogin(page);
    // Mock register endpoint
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }),
      })
    );
    await registerPage.fillStep1('Jane Smith', 'jane@test.com', 'password123');
    await expect(registerPage.step2Heading()).toBeVisible({ timeout: 5000 });
  });

  test('step 1 — failed registration shows error alert', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Email already registered' }),
      })
    );
    await registerPage.fillStep1('Jane Smith', 'existing@test.com', 'password123');
    await expect(registerPage.errorAlert()).toBeVisible({ timeout: 5000 });
    await expect(registerPage.errorAlert()).toContainText(/email already registered/i);
  });

  test('step 2 — requires consent checkbox to proceed', async ({ page }) => {
    // Advance to step 2 first
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }),
      })
    );
    await registerPage.fillStep1('Jane Smith', 'jane@test.com', 'password123');
    await registerPage.step2Heading().waitFor({ timeout: 5000 });

    // Fill child name and PIN but NOT consent
    await registerPage.childNameInput().fill('Alex');
    await registerPage.pinInput().fill('1234');
    await registerPage.continueButton().click();
    await expect(registerPage.errorAlert()).toBeVisible();
    await expect(registerPage.errorAlert()).toContainText(/consent/i);
  });

  test('step 2 — avatar picker has 8 options', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }),
      })
    );
    await registerPage.fillStep1('Jane Smith', 'jane@test.com', 'password123');
    await registerPage.step2Heading().waitFor({ timeout: 5000 });
    const radios = page.locator('input[type="radio"][name="avatar"]');
    await expect(radios).toHaveCount(8);
  });

  test('step 3 — shows subject checkboxes from API', async ({ page }) => {
    // Advance through steps 1 and 2
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }),
      })
    );
    await page.route('**/api/v1/auth/students', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ student_id: 'new-student-id', display_name: 'Alex', avatar_id: 'avatar-01' }),
      })
    );
    await registerPage.fillStep1('Jane Smith', 'jane@test.com', 'password123');
    await registerPage.step2Heading().waitFor({ timeout: 5000 });
    await registerPage.fillStep2('Alex', '1234');
    await registerPage.step3Heading().waitFor({ timeout: 5000 });
    // Step 3 should show subject labels from DEMO_SUBJECTS
    await expect(page.getByText('Mathematics')).toBeVisible();
    await expect(page.getByText('English')).toBeVisible();
  });

  test('step 3 — "Skip for now" navigates to dashboard', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fake.token.sig', token_type: 'bearer' }) })
    );
    await page.route('**/api/v1/auth/students', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ student_id: 'new-student-id', display_name: 'Alex', avatar_id: 'avatar-01' }) })
    );
    await registerPage.fillStep1('Jane Smith', 'jane@test.com', 'password123');
    await registerPage.step2Heading().waitFor({ timeout: 5000 });
    await registerPage.fillStep2('Alex', '1234');
    await registerPage.step3Heading().waitFor({ timeout: 5000 });
    await registerPage.skipButton().click();
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});

// ─── Student Login ───────────────────────────────────────────────────────────

test.describe('Student Code Login (/student-login)', () => {
  let studentLoginPage: StudentLoginPage;

  test.beforeEach(async ({ page }) => {
    studentLoginPage = new StudentLoginPage(page);
    await studentLoginPage.goto();
  });

  test('renders the student help heading and parent email request field', async () => {
    await expect(studentLoginPage.heading()).toBeVisible();
    await expect(studentLoginPage.emailInput()).toBeVisible();
    await expect(studentLoginPage.sendCodeButton()).toBeVisible();
  });

  test('requesting a code shows the generic success message and development code', async ({ page }) => {
    await page.route('**/api/v1/auth/student-login/request-code', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If that family account is available, a student sign-in code is on the way.',
          loginCode: '1234',
          expiresIn: 600,
        }),
      })
    );

    await studentLoginPage.requestCode('parent@example.com');
    await expect(studentLoginPage.messagePanel()).toContainText(/development code: 1234/i);
  });

  test('valid code signs a student in and navigates to /learn', async ({ page }) => {
    await page.route('**/api/v1/auth/student-login/request-code', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'If that family account is available, a student sign-in code is on the way.', loginCode: '1234', expiresIn: 600 }),
      })
    );
    await page.route('**/api/v1/auth/student-login/verify-code', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Signed in as Alex.',
          authenticated: true,
          requiresStudentSelection: false,
          accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ3MDAwMDAwMDAsInN1YiI6InN0dWRlbnQtZGVtby1pZCIsInJvbGUiOiJzdHVkZW50In0.fake_signature',
          expiresIn: 3600,
          student: { student_id: 'student-demo-id', display_name: 'Alex', grade_level: 3, avatar_id: 'owl' },
          students: [],
        }),
      })
    );

    await studentLoginPage.requestAndEnterCode('parent@example.com', '1234');
    await expect(page).toHaveURL(/\/learn/, { timeout: 5000 });
    await expect(studentLoginPage.learnGreeting()).toContainText(/hi, alex/i);
  });

  test('invalid code shows an error banner', async ({ page }) => {
    await page.route('**/api/v1/auth/student-login/verify-code', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'This student login code is invalid or expired.' }),
      })
    );

    await studentLoginPage.enterCode('9999');
    await expect(studentLoginPage.errorAlert()).toBeVisible({ timeout: 5000 });
    await expect(studentLoginPage.errorAlert()).toContainText(/invalid or expired/i);
  });

  test('multi-student verification shows the learner chooser before sign-in completes', async ({ page }) => {
    await page.route('**/api/v1/auth/student-login/verify-code', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Choose who is learning today.',
          authenticated: false,
          requiresStudentSelection: true,
          selectionToken: 'selection-token',
          students: [
            { student_id: 'student-demo-id', display_name: 'Alex', grade_level: 3, avatar_id: 'owl' },
            { student_id: 'student-002', display_name: 'Sam', grade_level: 4, avatar_id: 'fox' },
          ],
        }),
      })
    );
    await page.route('**/api/v1/auth/student-login/select-student', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Signed in as Sam.',
          authenticated: true,
          requiresStudentSelection: false,
          accessToken: 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQ3MDAwMDAwMDAsInN1YiI6InN0dWRlbnQtMDAyIiwicm9sZSI6InN0dWRlbnQifQ.fake_signature',
          expiresIn: 3600,
          student: { student_id: 'student-002', display_name: 'Sam', grade_level: 4, avatar_id: 'fox' },
          students: [],
        }),
      })
    );

    await studentLoginPage.enterCode('2222');
    await expect(studentLoginPage.messagePanel()).toContainText(/choose who is learning today/i);
    await studentLoginPage.chooseStudent('Sam');
    await expect(page).toHaveURL(/\/learn/, { timeout: 5000 });
    await expect(studentLoginPage.learnGreeting()).toContainText(/hi, sam/i);
  });
});
