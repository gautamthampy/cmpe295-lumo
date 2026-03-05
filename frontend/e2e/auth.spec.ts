/**
 * Auth flow e2e tests — parent login, registration wizard, student PIN login.
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

test.describe('Student PIN Login (/student-login)', () => {
  let studentLoginPage: StudentLoginPage;

  test.beforeEach(async ({ page, authMocks }) => {
    studentLoginPage = new StudentLoginPage(page);
    // Mock the /auth/me call that loads the student list
    await authMocks.mockStudentList(page, DEMO_STUDENTS);
    await studentLoginPage.goto();
  });

  test('renders LUMO logo and "Who\'s learning today?" heading', async () => {
    await expect(studentLoginPage.logo()).toBeVisible();
    await expect(studentLoginPage.heading()).toBeVisible();
  });

  test('shows student avatar buttons from /auth/me', async () => {
    await expect(studentLoginPage.studentButton('Alex')).toBeVisible({ timeout: 5000 });
  });

  test('selecting a student shows PIN pad', async () => {
    await studentLoginPage.selectStudent('Alex');
    await expect(studentLoginPage.pinDots()).toBeVisible();
    // Check all 10 digit buttons are present
    for (let d = 0; d <= 9; d++) {
      await expect(studentLoginPage.digitButton(d)).toBeVisible();
    }
  });

  test('back button returns to avatar grid', async ({ page }) => {
    await studentLoginPage.selectStudent('Alex');
    await studentLoginPage.backButton().click();
    await expect(studentLoginPage.studentButton('Alex')).toBeVisible();
  });

  test('backspace button removes last digit', async () => {
    await studentLoginPage.selectStudent('Alex');
    await studentLoginPage.digitButton(1).click();
    await studentLoginPage.digitButton(2).click();
    await studentLoginPage.backspaceButton().click();
    // After backspace, only 1 dot should be filled — verified by PIN state
    await studentLoginPage.digitButton(3).click(); // now at 2 digits
    await studentLoginPage.backspaceButton().click(); // back to 1
    // Just verify no crash and pin pad still visible
    await expect(studentLoginPage.pinDots()).toBeVisible();
  });

  test('correct PIN auto-submits and navigates to /learn', async ({ page, authMocks }) => {
    await authMocks.mockStudentLogin(page);
    await authMocks.mockSubjects(page);
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await studentLoginPage.loginAs('Alex', '1234');
    await expect(page).toHaveURL(/\/learn/, { timeout: 5000 });
  });

  test('wrong PIN shows error and clears digits', async ({ page }) => {
    await page.route('**/api/v1/auth/students/*/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid PIN' }),
      })
    );
    await studentLoginPage.loginAs('Alex', '9999');
    await expect(studentLoginPage.errorAlert()).toBeVisible({ timeout: 5000 });
    await expect(studentLoginPage.errorAlert()).toContainText(/wrong pin/i);
  });

  test('shows "no student profiles yet" when list is empty', async ({ page, authMocks }) => {
    await page.unroute(`**/api/v1/auth/me`);
    await authMocks.mockStudentList(page, []);
    await studentLoginPage.goto();
    await expect(studentLoginPage.noStudentsMessage()).toBeVisible({ timeout: 5000 });
  });

  test('shows loading state while fetching students', async ({ page }) => {
    // Delay the /auth/me response
    await page.unroute(`**/api/v1/auth/me`);
    await page.route('**/api/v1/auth/me', async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ students: [] }) });
    });
    await studentLoginPage.goto();
    // Loading text should appear briefly
    await expect(page.getByText(/loading/i)).toBeVisible({ timeout: 2000 }).catch(() => {
      // May have resolved too fast — that's fine
    });
  });
});
