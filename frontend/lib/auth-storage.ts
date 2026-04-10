export const TOKEN_STORAGE_KEY = "lumo_token";
export const ROLE_STORAGE_KEY = "lumo_role";
export const DISPLAY_NAME_STORAGE_KEY = "lumo_display_name";
export const GRADE_LEVEL_STORAGE_KEY = "lumo_grade_level";
export const STUDENT_TOKEN_COOKIE_NAME = process.env.NEXT_PUBLIC_STUDENT_TOKEN_COOKIE_NAME ?? process.env.STUDENT_TOKEN_COOKIE_NAME ?? "lumo_student_token";

function readCookieValue(cookieHeader: string, name: string): string | null {
  for (const entry of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = entry.trim().split("=");
    if (rawName !== name) {
      continue;
    }

    return decodeURIComponent(rawValue.join("="));
  }

  return null;
}

function cookieAttributes() {
  const attributes = ["path=/", "samesite=lax"];

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("secure");
  }

  return attributes.join("; ");
}

export function readStudentTokenFromCookieString(cookieHeader: string): string | null {
  return readCookieValue(cookieHeader, STUDENT_TOKEN_COOKIE_NAME);
}

export function readStudentTokenFromBrowser(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionRole = sessionStorage.getItem(ROLE_STORAGE_KEY);
  const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (sessionRole === "student" && sessionToken) {
    return sessionToken;
  }

  // Fallback: read from cookie if sessionStorage was cleared (e.g. tab close)
  return readStudentTokenFromCookieString(document.cookie);
}

export function writeStudentTokenCookie(token: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${STUDENT_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes()}`;
}

export function clearStudentTokenCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${STUDENT_TOKEN_COOKIE_NAME}=; max-age=0; ${cookieAttributes()}`;
}