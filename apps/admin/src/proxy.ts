import { createHash, timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { buildStrictCsp } from '@/securityHeaders';

const BASIC_AUTH_REALM = 'Login';

/**
 * Routes called by machines that cannot complete a browser Basic Auth
 * challenge. Their route handlers retain their existing authentication and
 * validation; this list only exempts them from the panel-wide extra layer.
 */
const BASIC_AUTH_EXEMPTIONS = new Set([
  'GET /api/ap/signing-key.json',
  'GET /api/ap/revoked.json',
  'GET /api/directory',
  'PUT /api/directory/listing',
  'GET /api/health',
  'POST /api/contact',
  'POST /api/consent',
  'POST /api/social/tiktok/scheduled',
  'POST /api/social/instagram/scheduled',
]);

function constantTimeEquals(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function expectedBasicAuthorization(credentials: string | undefined): string | null {
  if (!credentials || /[\r\n]/.test(credentials)) return null;
  const separator = credentials.indexOf(':');
  if (separator <= 0 || separator === credentials.length - 1) return null;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

function basicAuthResponse(request: NextRequest): NextResponse | null {
  const routeKey = `${request.method.toUpperCase()} ${request.nextUrl.pathname}`;
  if (BASIC_AUTH_EXEMPTIONS.has(routeKey)) return null;

  const expected = expectedBasicAuthorization(process.env.PANEL_BASIC_AUTH_CREDENTIALS);
  if (!expected) {
    // Local development stays usable without a second credential. A deployed
    // production build fails closed if the credential was not materialised.
    return process.env.NODE_ENV === 'production' ? new NextResponse(null, { status: 503 }) : null;
  }

  const presented = request.headers.get('authorization') ?? '';
  if (constantTimeEquals(presented, expected)) return null;

  return new NextResponse(null, {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${BASIC_AUTH_REALM}"` },
  });
}

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

/** Per-request, unguessable nonce for the enforced strict CSP. */
function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * Attaches the strict nonce CSP to a response as the enforced policy.
 * The Report-Only pre-flight period is complete; unsafe-inline is gone.
 * See securityHeaders.ts.
 */
function withCsp(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildStrictCsp(nonce));
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sAccessToken')?.value;
  const isAuthenticated = !!token && isTokenValid(token);
  const nonce = generateNonce();

  const basicAuthFailure = basicAuthResponse(request);
  if (basicAuthFailure) return withCsp(basicAuthFailure, nonce);

  // Preserve the full invitation URL through sign-in. The route lives outside
  // the super-admin layout because its recipient does not have that role yet,
  // but invite details still require an authenticated account.
  if (!isAuthenticated && pathname === '/accept-invite') {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
    return withCsp(NextResponse.redirect(authUrl), nonce);
  }

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
    // API paths are explicit so dotted route names such as the AP JSON trust
    // anchors cannot fall through the static-asset exclusion below.
    '/api/:path*',
    // Next.js statically parses this config and only accepts a string literal here;
    // String.raw breaks the production build, so the escaped form stays. NOSONAR
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|json|txt|xml|css|js|map|woff|woff2|ttf|eot)).*)', // NOSONAR: Next.js requires a static string literal
  ],
};
