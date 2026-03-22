export const authRoutes = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  resendVerification: "/auth/resend-verification",
  logout: "/auth/logout",
  session: "/auth/session",
  parentDashboard: "/auth/me",
  requestStudentLoginCode: "/auth/student-login/request-code",
  verifyStudentLoginCode: "/auth/student-login/verify-code",
  selectStudentAfterCode: "/auth/student-login/select-student",
  generateStudentLoginCode: (studentId: string) => `/auth/students/${studentId}/login-code`,
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
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

export type StudentSummary = {
  student_id: string;
  display_name: string;
  grade_level: number;
  avatar_id: string;
};

export type ParentDashboardPayload = {
  parent_id: string;
  email: string;
  students: StudentSummary[];
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
