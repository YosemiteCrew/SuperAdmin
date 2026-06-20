import { NextRequest, NextResponse } from 'next/server';

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sAccessToken')?.value;
  const isAuthenticated = !!token && isTokenValid(token);

  // `/api/*` is exempt from the HTML redirect on purpose: API routes authenticate
  // themselves (e.g. /api/profile uses withSession and returns a 401) or are
  // intentionally public (/api/auth, /api/signout, /api/health). Redirecting a
  // fetch/XHR to the /auth page would be the wrong response for an API client.
  const isPublicPath = pathname.startsWith('/auth') || pathname.startsWith('/api/');

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (pathname === '/') {
    const destination = isAuthenticated ? '/dashboard' : '/auth';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Authenticated users are bounced away from auth screens — except the MFA
  // screens, which a signed-in-but-MFA-incomplete user still needs to reach.
  if (isAuthenticated && pathname.startsWith('/auth') && !pathname.startsWith('/auth/mfa')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Next.js statically parses this config and only accepts a string literal here;
    // String.raw breaks the production build, so the escaped form stays. NOSONAR
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml|css|js|map|woff|woff2|ttf|eot)).*)', // NOSONAR: Next.js requires a static string literal
  ],
};
