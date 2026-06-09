const isProd = process.env.NODE_ENV === 'production';

const cspDirectives: string[] = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js hydration). 'unsafe-eval' only in dev for HMR.
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  // Styles: self + inline (Tailwind v4) + font CDNs we actually use
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  // Images: self + data URIs (inline SVG) + blob (next/image)
  "img-src 'self' data: blob:",
  // Fonts: self + Fontshare CDN (Satoshi) + Google Fonts
  "font-src 'self' https://fonts.gstatic.com https://cdn.fontshare.com",
  // Connect: same-origin only. SuperTokens core is reached server-side.
  // Dev needs ws:// for HMR.
  `connect-src 'self'${isProd ? '' : ' ws://localhost:* wss://localhost:*'}`,
  // Frames: we don't embed any third-party iframes
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

if (isProd) {
  cspDirectives.push('upgrade-insecure-requests');
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

export const securityHeaders: { key: string; value: string }[] = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: permissionsPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
];

if (isProd) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}
