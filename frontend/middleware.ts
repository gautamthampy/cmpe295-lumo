import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { STUDENT_TOKEN_COOKIE_NAME } from "@/lib/auth-storage";

const PARENT_PROTECTED_PATHS = ["/portal", "/students"];
const STUDENT_PROTECTED_PATHS = ["/learn", "/diagnostic"];
const SHARED_PREVIEW_PATHS = ["/lessons/generated"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "lumo_session";

function isStaticAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico" || pathname.includes(".");
}

function matchesProtectedPath(pathname: string, protectedPaths: readonly string[]) {
  return protectedPaths.some((protectedPath) => pathname === protectedPath || pathname.startsWith(`${protectedPath}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nextPath = `${pathname}${request.nextUrl.search}`;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const hasParentSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const hasStudentSession = Boolean(request.cookies.get(STUDENT_TOKEN_COOKIE_NAME)?.value);

  if (matchesProtectedPath(pathname, PARENT_PROTECTED_PATHS)) {
    if (hasParentSession) {
      return NextResponse.next();
    }

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(signInUrl);
  }

  if (matchesProtectedPath(pathname, STUDENT_PROTECTED_PATHS)) {
    if (hasStudentSession) {
      return NextResponse.next();
    }

    const studentLoginUrl = new URL("/student-login", request.url);
    studentLoginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(studentLoginUrl);
  }

  if (matchesProtectedPath(pathname, SHARED_PREVIEW_PATHS)) {
    if (hasParentSession || hasStudentSession) {
      return NextResponse.next();
    }

    const studentLoginUrl = new URL("/student-login", request.url);
    studentLoginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(studentLoginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
