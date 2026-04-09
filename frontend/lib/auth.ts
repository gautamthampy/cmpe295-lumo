import { readStudentTokenFromBrowser } from "@/lib/auth-storage";

export const authRoutes = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  resendVerification: "/auth/resend-verification",
  logout: "/auth/logout",
  session: "/auth/session",
  studentSession: "/auth/student-session",
  subjects: "/auth/subjects",
  parentDashboard: "/auth/me",
  createStudent: "/auth/students",
  requestStudentLoginCode: "/auth/student-login/request-code",
  verifyStudentLoginCode: "/auth/student-login/verify-code",
  selectStudentAfterCode: "/auth/student-login/select-student",
  generateStudentLoginCode: (studentId: string) => `/auth/students/${studentId}/login-code`,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

/**
 * For server-to-server calls (SSR / route handlers) use the backend directly.
 * For browser calls, proxy through the Next.js API routes so that the session
 * cookie is set on the frontend origin and forwarded automatically.
 */
const isBrowser = typeof window !== "undefined";
const AUTH_PREFIX = isBrowser ? "/api/backend" : API_BASE_URL;

export async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const studentAccessToken = readStudentTokenFromBrowser();
  if (studentAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${studentAccessToken}`);
  }

  const response = await fetch(`${AUTH_PREFIX}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((payload as { detail?: string }).detail ?? "Something went wrong.");
  }

  return payload as T;
}

export type AuthMessage = {
  message: string;
};

export type SignUpPayload = AuthMessage & {
  verificationToken?: string;
};

export type ForgotPasswordPayload = AuthMessage & {
  resetToken?: string;
};

export type SignInPayload = AuthMessage & {
  emailVerified: boolean;
  nextPath?: string;
};

export type SessionPayload = {
  authenticated: boolean;
  emailVerified: boolean;
  email?: string;
};

export type SubjectCatalogItem = {
  subject_id: string;
  name: string;
  slug: string;
};

export type StudentSummary = {
  student_id: string;
  display_name: string;
  grade_level: number;
  avatar_id: string;
};

export type StudentCreatePayload = {
  displayName: string;
  gradeLevel: number;
  avatarId?: string;
  consentGiven?: boolean;
};

export type ParentDashboardPayload = {
  parent_id: string;
  email: string;
  students: StudentSummary[];
};

export type StudentSessionPayload = {
  authenticated: boolean;
  student?: StudentSummary | null;
};

export type StudentLoginCodeIssuePayload = AuthMessage & {
  loginCode?: string;
  expiresIn?: number;
};

export type StudentAuthPayload = AuthMessage & {
  authenticated: boolean;
  requiresStudentSelection: boolean;
  accessToken?: string;
  expiresIn?: number;
  selectionToken?: string;
  student?: StudentSummary;
  students: StudentSummary[];
};
