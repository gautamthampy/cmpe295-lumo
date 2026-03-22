import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = ["/portal", "/students"];

function isStaticAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico" || pathname.includes(".");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const isProtectedPath = PROTECTED_PATHS.some((protectedPath) => pathname === protectedPath || pathname.startsWith(`${protectedPath}/`));
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("lumo_session")?.value;
  if (sessionCookie) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
