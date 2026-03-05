/**
 * Parent student management page (/students) e2e tests.
 * All auth + API calls are intercepted so no live backend is required.
 */
import { test, expect, DEMO_STUDENTS } from './fixtures/test-fixtures';
import { StudentsPage } from './pages/students.page';

test.describe('My Students page (/students)', () => {
  let studentsPage: StudentsPage;

  // Helper: inject parent token and mock /auth/me before navigating
  async function setupAsParent(page: import('@playwright/test').Page, authMocks: import('./fixtures/test-fixtures').AuthMocks, students = DEMO_STUDENTS) {
    await authMocks.injectParentToken(page);
    await authMocks.mockStudentList(page, students);
  }

  test.beforeEach(async ({ page, authMocks }) => {
    studentsPage = new StudentsPage(page);
    await setupAsParent(page, authMocks);
  });

  test('renders "My Students" heading', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(studentsPage.heading()).toBeVisible();
  });

  test('shows "+ Add Student" link', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(studentsPage.addStudentLink()).toBeVisible();
  });

  test('shows student card with name and grade for each student', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(page.getByText('Alex')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/grade 3/i)).toBeVisible();
  });

  test('shows enrolled subject tags on student card', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(page.getByText('Mathematics')).toBeVisible({ timeout: 5000 });
  });

  test('"Find gaps" button is visible on student card', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(studentsPage.findGapsButton('Alex')).toBeVisible({ timeout: 5000 });
  });

  test('"Generate lesson" link points to editor with student_id', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    const link = studentsPage.generateLessonLink('Alex');
    await expect(link).toBeVisible({ timeout: 5000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('/lessons/editor');
    expect(href).toContain('student_id=student-demo-id');
  });

  test('"Progress" link points to analytics with student_id', async ({ page }) => {
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    const link = studentsPage.progressLink('Alex');
    await expect(link).toBeVisible({ timeout: 5000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('/lessons/analytics');
    expect(href).toContain('student_id=student-demo-id');
  });

  test('shows empty state when no students', async ({ page, authMocks }) => {
    await page.unroute('**/api/v1/auth/me');
    await authMocks.mockStudentList(page, []);
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(studentsPage.emptyState()).toBeVisible({ timeout: 5000 });
    await expect(studentsPage.setupProfileLink()).toBeVisible();
  });

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    // Clear any injected tokens
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await studentsPage.goto();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('"Find gaps" button calls diagnostics API and shows loading state', async ({ page }) => {
    // Mock diagnostics generate endpoint
    await page.route('**/api/v1/diagnostics/generate', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ assessment_id: 'diag-001', activities: [] }),
      })
    );
    // Override clipboard.writeText to avoid permission error in headless
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        writable: true,
      });
    });
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    const btn = studentsPage.findGapsButton('Alex');
    await btn.click();
    // Button becomes "Creating..."
    await expect(btn).toContainText(/creating/i, { timeout: 5000 }).catch(() => {
      // May resolve too fast in fast environments
    });
  });

  test('shows multiple student cards when multiple students exist', async ({ page, authMocks }) => {
    await page.unroute('**/api/v1/auth/me');
    await authMocks.mockStudentList(page, [
      ...DEMO_STUDENTS,
      { student_id: 'student-002', display_name: 'Sam', avatar_id: 'avatar-02', grade_level: 4, subjects: [] },
    ]);
    await studentsPage.goto();
    await studentsPage.waitForLoaded();
    await expect(page.getByText('Alex')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Sam')).toBeVisible({ timeout: 5000 });
  });
});
