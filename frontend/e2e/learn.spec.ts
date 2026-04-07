/**
 * Student Learn page (/learn) e2e tests.
 * Uses injected student token + mocked APIs to avoid needing a live backend.
 */
import { test, expect, DEMO_SUBJECTS } from './fixtures/test-fixtures';
import { LearnPage } from './pages/learn.page';

const MOCK_LESSONS = [
  {
    lesson_id: 'lesson-001',
    title: 'Introduction to Fractions',
    subject: 'math',
    grade_level: 3,
    status: 'active',
    prerequisites: [],
    misconception_tags: [],
  },
  {
    lesson_id: 'lesson-002',
    title: 'Multiplication Tables',
    subject: 'math',
    grade_level: 3,
    status: 'active',
    prerequisites: [],
    misconception_tags: [],
  },
];

test.describe('Student Learn page (/learn)', () => {
  let learnPage: LearnPage;

  async function setupAsStudent(
    page: import('@playwright/test').Page,
    authMocks: import('./fixtures/test-fixtures').AuthMocks,
    lessons = MOCK_LESSONS
  ) {
    // Inject student token into sessionStorage
    await authMocks.injectStudentToken(page);
    // Mock subjects and lessons endpoints
    await authMocks.mockSubjects(page);
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(lessons),
      })
    );
  }

  test.beforeEach(async ({ page, authMocks }) => {
    learnPage = new LearnPage(page);
    await setupAsStudent(page, authMocks);
    await learnPage.goto();
    await learnPage.waitForLoaded();
  });

  test('renders personalised greeting with student name', async () => {
    await expect(learnPage.greeting()).toBeVisible();
    await expect(learnPage.greeting()).toContainText(/hi,.*alex/i);
  });

  test('shows tagline text', async () => {
    await expect(learnPage.tagline()).toBeVisible();
  });

  test('shows "Your subjects" section with subject buttons', async () => {
    await expect(learnPage.subjectsHeading()).toBeVisible();
    await expect(learnPage.subjectButton('Mathematics')).toBeVisible();
    await expect(learnPage.subjectButton('English')).toBeVisible();
  });

  test('shows lesson links for active lessons', async () => {
    const links = learnPage.lessonLinks();
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('lesson links navigate to lesson viewer', async ({ page }) => {
    const firstLink = learnPage.lessonLinks().first();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/\/lessons\/lesson-0/);
  });

  test('shows "Ready to explore" heading when lessons exist', async () => {
    await expect(learnPage.lessonsHeading()).toBeVisible();
    await expect(learnPage.lessonsHeading()).toContainText(/ready to explore/i);
  });

  test('shows "No lessons yet" when no active lessons', async ({ page, authMocks }) => {
    await page.unroute('**/api/v1/lessons**');
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await learnPage.goto();
    await learnPage.waitForLoaded();
    await expect(learnPage.lessonsHeading()).toContainText(/no lessons yet/i);
  });

  test('has sign out button', async () => {
    await expect(learnPage.signOutButton()).toBeVisible();
  });

  test('sign out button redirects to /student-login', async ({ page, authMocks }) => {
    await authMocks.mockStudentList(page);
    await learnPage.signOutButton().click();
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('unauthenticated user is redirected to /student-login', async ({ page }) => {
    // Clear session storage to simulate unauthenticated state
    await page.evaluate(() => sessionStorage.clear());
    await learnPage.goto();
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('parent token (not student) is redirected to /student-login', async ({ page, authMocks }) => {
    // Inject parent token — the /learn page requires role === 'student'
    await authMocks.injectParentToken(page);
    await learnPage.goto();
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('subject button navigates to /learn?subject=slug', async ({ page }) => {
    await learnPage.subjectButton('Mathematics').click();
    await expect(page).toHaveURL(/subject=math/, { timeout: 5000 });
  });
});
