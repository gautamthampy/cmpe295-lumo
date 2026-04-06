import { test as base, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export interface LessonSummary {
  lesson_id: string;
  title: string;
  subject: string;
  grade_level: number;
  status: string;
  prerequisites: string[];
  misconception_tags: string[];
}

/** Fetched once per worker and cached in-memory. */
let _cachedLessons: LessonSummary[] | null = null;

async function fetchLessons(): Promise<LessonSummary[]> {
  if (_cachedLessons) return _cachedLessons;
  const res = await fetch(`${API_URL}/lessons`);
  if (!res.ok) throw new Error(`GET /lessons failed: ${res.status}`);
  _cachedLessons = await res.json() as LessonSummary[];
  return _cachedLessons;
}

export interface LessonData {
  getAll(): Promise<LessonSummary[]>;
  getFirst(): Promise<LessonSummary>;
  getByTitle(title: string): Promise<LessonSummary>;
  /** Returns a lesson that is known to have interactive activities embedded (lesson 1 or 2). */
  getWithActivities(): Promise<LessonSummary>;
}

export interface StudentMock {
  student_id: string;
  display_name: string;
  avatar_id: string;
  grade_level?: number;
  consent_given?: boolean;
  subjects?: { subject_id: string; name: string; slug: string }[];
}

/** Auth helpers for mocking API calls and injecting tokens. */
export interface AuthMocks {
  mockParentLogin(page: import('@playwright/test').Page): Promise<void>;
  mockParentLoginFail(page: import('@playwright/test').Page): Promise<void>;
  mockStudentList(page: import('@playwright/test').Page, students?: StudentMock[]): Promise<void>;
  mockStudentLogin(page: import('@playwright/test').Page): Promise<void>;
  mockSubjects(page: import('@playwright/test').Page): Promise<void>;
  injectParentToken(page: import('@playwright/test').Page): Promise<void>;
  injectStudentToken(page: import('@playwright/test').Page): Promise<void>;
}

/**
 * Build a minimal fake JWT for client-side role checks.
 * The signature is fake — only used to verify the payload decoding on the frontend.
 */
function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const header = enc({ alg: 'HS256', typ: 'JWT' });
  const body = enc({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload });
  return `${header}.${body}.fake_signature`;
}

export const DEMO_PARENT_TOKEN = fakeJwt({ sub: 'parent-demo-id', role: 'parent' });
export const DEMO_STUDENT_TOKEN = fakeJwt({ sub: 'student-demo-id', role: 'student' });

export const DEMO_STUDENTS: StudentMock[] = [
  {
    student_id: 'student-demo-id',
    display_name: 'Alex',
    avatar_id: 'avatar-01',
    grade_level: 3,
    consent_given: true,
    subjects: [{ subject_id: 'subj-math-id', name: 'Mathematics', slug: 'math' }],
  },
];

export const DEMO_SUBJECTS = [
  { subject_id: 'subj-math-id', name: 'Mathematics', slug: 'math' },
  { subject_id: 'subj-eng-id', name: 'English', slug: 'english' },
];

const AUTH_STORE_KEY = 'lumo-auth';
const TOKEN_STORAGE_KEY = 'lumo_token';
const ROLE_STORAGE_KEY = 'lumo_role';
const DISPLAY_NAME_STORAGE_KEY = 'lumo_display_name';
const GRADE_LEVEL_STORAGE_KEY = 'lumo_grade_level';
const STUDENT_TOKEN_COOKIE_NAME = 'lumo_student_token';

type Fixtures = {
  lessonData: LessonData;
  authMocks: AuthMocks;
};

export const test = base.extend<Fixtures>({
  lessonData: async ({}, use) => {
    const data: LessonData = {
      async getAll() {
        return fetchLessons();
      },
      async getFirst() {
        const all = await fetchLessons();
        if (!all.length) throw new Error('No seeded lessons found. Run: python -m app.seed.seed_db');
        return all[0];
      },
      async getByTitle(title: string) {
        const all = await fetchLessons();
        const lesson = all.find((l) => l.title.toLowerCase().includes(title.toLowerCase()));
        if (!lesson) throw new Error(`No lesson found with title containing "${title}". Available: ${all.map((l) => l.title).join(', ')}`);
        return lesson;
      },
      async getWithActivities() {
        const all = await fetchLessons();
        // Lessons 1 (Fractions) and 2 (Multiplication) have embedded interactive activities
        const candidates = ['fraction', 'multiplication', 'division'];
        for (const keyword of candidates) {
          const found = all.find((l) => l.title.toLowerCase().includes(keyword));
          if (found) return found;
        }
        // Fall back to first lesson
        if (!all.length) throw new Error('No seeded lessons found. Run: python -m app.seed.seed_db');
        return all[0];
      },
    };
    await use(data);
  },

  authMocks: async ({}, use) => {
    const mocks: AuthMocks = {
      async mockParentLogin(page) {
        await page.route(`${API_URL}/auth/login`, (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ access_token: DEMO_PARENT_TOKEN, token_type: 'bearer' }),
          })
        );
      },

      async mockParentLoginFail(page) {
        await page.route(`${API_URL}/auth/login`, (route) =>
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Invalid credentials' }),
          })
        );
      },

      async mockStudentList(page, students = DEMO_STUDENTS) {
        await page.route(`${API_URL}/auth/me`, (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              parent_id: 'parent-demo-id',
              email: 'demo@lumo.app',
              display_name: 'Demo Parent',
              students,
            }),
          })
        );
      },

      async mockStudentLogin(page) {
        await page.route(`${API_URL}/auth/students/*/login`, (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ access_token: DEMO_STUDENT_TOKEN, token_type: 'bearer' }),
          })
        );
      },

      async mockSubjects(page) {
        await page.route(`${API_URL}/auth/subjects`, (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(DEMO_SUBJECTS),
          })
        );
      },

      async injectParentToken(page) {
        await page.goto('/login');
        await page.evaluate(
          ({ key, token, name }: { key: string; token: string; name: string }) => {
            const state = {
              state: { role: 'parent', token, userId: 'parent-demo-id', displayName: name },
              version: 0,
            };
            localStorage.setItem(key, JSON.stringify(state));
          },
          { key: AUTH_STORE_KEY, token: DEMO_PARENT_TOKEN, name: 'Demo Parent' }
        );
      },

      async injectStudentToken(page) {
        await page.goto('/student-login');
        await page.evaluate(
          ({
            key,
            token,
            tokenKey,
            roleKey,
            nameKey,
            gradeKey,
            cookieName,
          }: {
            key: string;
            token: string;
            tokenKey: string;
            roleKey: string;
            nameKey: string;
            gradeKey: string;
            cookieName: string;
          }) => {
            const state = {
              state: { role: 'student', token, userId: 'student-demo-id', displayName: 'Alex' },
              version: 0,
            };
            sessionStorage.setItem(key, JSON.stringify(state));
            sessionStorage.setItem(tokenKey, token);
            sessionStorage.setItem(roleKey, 'student');
            sessionStorage.setItem(nameKey, 'Alex');
            sessionStorage.setItem(gradeKey, '3');
            document.cookie = `${cookieName}=${encodeURIComponent(token)}; path=/; samesite=lax`;
          },
          {
            key: AUTH_STORE_KEY,
            token: DEMO_STUDENT_TOKEN,
            tokenKey: TOKEN_STORAGE_KEY,
            roleKey: ROLE_STORAGE_KEY,
            nameKey: DISPLAY_NAME_STORAGE_KEY,
            gradeKey: GRADE_LEVEL_STORAGE_KEY,
            cookieName: STUDENT_TOKEN_COOKIE_NAME,
          }
        );
      },
    };
    await use(mocks);
  },
});

export { expect };
