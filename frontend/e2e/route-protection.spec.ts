/**
 * Route protection & middleware e2e tests.
 * Tests that protected routes redirect unauthenticated users correctly.
 *
 * Note: The middleware (middleware.ts) checks for a `lumo_token` cookie or
 * Authorization header — not localStorage/sessionStorage — because it runs
 * in Edge Runtime. Most auth is enforced client-side by the Zustand store.
 * These tests verify BOTH the middleware redirect (cookie-based) AND the
 * client-side redirect (store-based).
 */
import { test, expect } from './fixtures/test-fixtures';

test.describe('Public routes are accessible without auth', () => {
  test('/login is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /parent sign in/i })).toBeVisible();
  });

  test('/register is accessible', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
  });

  test('/student-login is accessible', async ({ page, authMocks }) => {
    await authMocks.mockStudentList(page);
    await page.goto('/student-login');
    await expect(page).toHaveURL(/\/student-login/);
    await expect(page.getByText(/who's learning today/i)).toBeVisible();
  });
});

test.describe('Middleware: /learn redirect when no cookie token', () => {
  test('GET /learn without lumo_token cookie redirects to /student-login', async ({ page }) => {
    // Ensure no cookies set
    await page.context().clearCookies();
    await page.goto('/learn');
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('GET /diagnostic/* without lumo_token cookie redirects to /student-login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/diagnostic/some-assessment-id');
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });
});

test.describe('Client-side route guard: /learn requires student role', () => {
  test('unauthenticated (no token) redirects to /student-login', async ({ page, authMocks }) => {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    // Mock lessons so page doesn't hang on load
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/learn');
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('parent role token redirects to /student-login', async ({ page, authMocks }) => {
    await authMocks.injectParentToken(page);
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route('**/api/v1/auth/subjects', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/learn');
    await expect(page).toHaveURL(/\/student-login/, { timeout: 5000 });
  });

  test('valid student token allows access to /learn', async ({ page, authMocks }) => {
    await authMocks.injectStudentToken(page);
    await authMocks.mockSubjects(page);
    await page.route('**/api/v1/lessons**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/learn');
    // Should stay on /learn (not redirect)
    await expect(page).toHaveURL(/\/learn/, { timeout: 5000 });
  });
});

test.describe('Client-side route guard: /students requires parent role', () => {
  test('unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Unauthorized' }) })
    );
    await page.goto('/students');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('valid parent token allows access to /students', async ({ page, authMocks }) => {
    await authMocks.injectParentToken(page);
    await authMocks.mockStudentList(page);
    await page.goto('/students');
    await expect(page).toHaveURL(/\/students/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /my students/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Other protected routes remain accessible without redirect', () => {
  test('/lessons is accessible without auth', async ({ page }) => {
    await page.route('**/api/v1/lessons', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/lessons');
    // Middleware doesn't restrict /lessons — client shows lesson library
    await expect(page).toHaveURL(/\/lessons/);
  });

  test('/lessons/editor is accessible without auth', async ({ page }) => {
    await page.goto('/lessons/editor');
    await expect(page).toHaveURL(/\/lessons\/editor/);
    await expect(page.getByRole('heading', { name: /lesson editor/i })).toBeVisible();
  });

  test('/lessons/analytics is accessible without auth', async ({ page }) => {
    await page.route('**/api/v1/lessons/analytics/summary', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.goto('/lessons/analytics');
    await expect(page).toHaveURL(/\/lessons\/analytics/);
  });
});
