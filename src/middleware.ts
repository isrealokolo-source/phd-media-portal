import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('phd_session')?.value;

  // 1. Guard API Admin routes
  if (pathname.startsWith('/api/admin')) {
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication session required' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 2. Guard Authenticated Dashboard Routes (/admin and /artist)
  if (pathname.startsWith('/admin') || pathname.startsWith('/artist')) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (/images/*, /uploads/*, etc.)
     */
    '/admin/:path*',
    '/artist/:path*',
    '/api/admin/:path*',
  ],
};
