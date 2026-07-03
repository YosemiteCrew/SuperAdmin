const isProd = process.env.NODE_ENV === 'production';

// 'unsafe-eval' is only needed by the dev bundler (HMR); never in production.
const devOnlyEval = isProd ? '' : " 'unsafe-eval'";

/**
 * Builds the shared CSP directive list for a given `script-src` value. Only the
 * script source differs between the enforced (back-compat) policy and the strict
 * nonce policy, so everything else lives here.
 */
function cspDirectives(scriptSrc: string): string[] {
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Styles: self + inline (Tailwind v4) + font CDNs we actually use
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
    // Images: self + data URIs (inline SVG) + blob (next/image)
    "img-src 'self' data: blob:",
    // Fonts: self + Fontshare CDN (Satoshi) + Google Fonts
    "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com",
    // Connect: same-origin only. SuperTokens core is reached server-side.
    // Dev needs ws:// for HMR.
    `connect-src 'self'${isProd ? '' : ' ws://localhost:* wss://localhost:*'}`,
    "frame-src 'self'",
    // Anti-clickjacking — modern equivalent of X-Frame-Options
    "frame-ancestors 'self'",
    // Base URI cannot be overridden by injection
    "base-uri 'self'",
    // Forms only POST to same origin
    "form-action 'self'",
    // No Flash, no Java applets
    "object-src 'none'",
  ];
  if (isProd) directives.push('upgrade-insecure-requests');
  return directives;
}

/**
 * Strict nonce CSP — no 'unsafe-inline'. Scripts must carry the per-request
 * nonce; 'strict-dynamic' lets nonce'd scripts load their own dependencies.
 */
export function buildStrictCsp(nonce: string): string {
  return cspDirectives(`'self' 'nonce-${nonce}' 'strict-dynamic'${devOnlyEval}`).join('; ');
}

const permissionsPolicy = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'autoplay=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'gyroscope=()',
  'accelerometer=()',
  'interest-cohort=()',
].join(', ');

// Static headers applied via next.config. The CSP is set per-request in
// middleware instead (it needs a fresh nonce each request).
export const securityHeaders: { key: string; value: string }[] = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: permissionsPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

if (isProd) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}
