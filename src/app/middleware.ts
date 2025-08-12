import { NextRequest, NextResponse } from 'next/server';

// Force onboarding for all users who have not completed it yet.
// Simple heuristic: if user has not accepted NextAuth session cookie or we don't have any
// stored preferences in server, redirect to onboarding except for allowed paths.

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow onboarding pages themselves
  if (pathname.startsWith('/onboarding')) return NextResponse.next();

  // Bypass for API and static handled by matcher, but keep a defensive check
  if (pathname.startsWith('/api')) return NextResponse.next();

  // If there is no session cookie, push to onboarding
  const hasSession = req.cookies.has('next-auth.session-token') ||
                     req.cookies.has('__Secure-next-auth.session-token');

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}


