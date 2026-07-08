import { NextRequest, NextResponse } from 'next/server';

import { buildEnforcedCsp, buildStrictCsp } from '@/securityHeaders';

// NOTE: this decodes the JWT WITHOUT verifying its signature. It is deliberately
// NOT a security boundary — it only decides client-side redirects (a forged token
// at most reaches a page shell). Real authorization is enforced server-side by
// requireSuperAdmin()/getSSRSession(), which cryptographically verifies the
// session. Do not rely on this for access control.
function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Per-request, unguessable nonce for the strict (Report-Only) CSP. */
function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * Attaches CSP headers to a response: the enforced policy (back-compat) plus the
 * strict nonce policy in Report-Only so violations are observed before we
 * enforce it. See securityHeaders.ts.
 */
function withCsp(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildEnforcedCsp());
  response.headers.set('Content-Security-Policy-Report-Only', buildStrictCsp(nonce));
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sAccessToken')?.value;
  const isAuthenticated = !!token && isTokenValid(token);
  const nonce = generateNonce();

  // `/api/*` is exempt from the HTML redirect on purpose: API routes authenticate
  // themselves (e.g. /api/profile uses withSession and returns a 401) or are
  // intentionally public (/api/auth, /api/signout, /api/health). Redirecting a
  // fetch/XHR to the /auth page would be the wrong response for an API client.
  const isPublicPath = pathname.startsWith('/auth') || pathname.startsWith('/api/');

  if (!isAuthenticated && !isPublicPath) {
    return withCsp(NextResponse.redirect(new URL('/auth', request.url)), nonce);
  }

  // Reaching here for `/` implies an authenticated user (the unauthenticated
  // case was already redirected to /auth above).
  if (pathname === '/') {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.url)), nonce);
  }

  // Authenticated users are bounced away from auth screens — except the MFA
  // screens (a signed-in-but-MFA-incomplete user still needs them) and the
  // password-reset screen (linked from Settings for a signed-in admin).
  const authScreenAllowed =
    pathname.startsWith('/auth/mfa') || pathname.startsWith('/auth/reset-password');
  if (isAuthenticated && pathname.startsWith('/auth') && !authScreenAllowed) {
    return withCsp(NextResponse.redirect(new URL('/dashboard', request.url)), nonce);
  }

  // Forward the nonce to the app: `x-nonce` is read by the root layout for its
  // inline script, and the strict CSP on the request header is what makes Next
  // stamp the nonce onto its own hydration scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', buildStrictCsp(nonce));
  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), nonce);
}

export const config = {
  matcher: [
    // Next.js statically parses this config and only accepts a string literal here;
    // String.raw breaks the production build, so the escaped form stays. NOSONAR
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml|css|js|map|woff|woff2|ttf|eot)).*)', // NOSONAR: Next.js requires a static string literal
  ],
};
