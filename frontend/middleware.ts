import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require auth
const PUBLIC_PATHS = ['/login', '/register', '/student-login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes, API routes, and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Student-only route
  if (pathname.startsWith('/learn') || pathname.startsWith('/diagnostic')) {
    // Edge Runtime can't verify JWT signature — just check existence
    // The backend will reject invalid tokens with 401 anyway
    const token =
      request.cookies.get('lumo_token')?.value ??
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/student-login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
