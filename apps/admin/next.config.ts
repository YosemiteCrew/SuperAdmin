import type { NextConfig } from 'next';
import { securityHeaders } from './src/securityHeaders';

const nextConfig: NextConfig = {
  // The Prisma client is generated into packages/database/src/generated/client
  // and imported by relative path, so Next BUNDLES it (see the schema comment -
  // importing it as "@prisma/client" instead would hit Next's built-in
  // externals list and break every route handler).
  //
  // Prisma 7 uses the PostgreSQL driver adapter and has no native query-engine
  // binary to trace or copy into the deployment artifact.
  // No `images.remotePatterns` on purpose. The panel renders two images and both
  // are local (`/yosemite-crew-logo.png`); with no patterns configured Next
  // refuses every remote URL, which is the correct default here.
  //
  // What was here before was `cdn.yourdomain.com`, scaffold left-over for a
  // domain nobody owns. It read as configuration and was really a second lock on
  // the image optimizer - part of why GHSA-2xp9-vwfh-vxw4 (RCE via AVIF in the
  // Image Optimization API, fixed in next 16.3.3) had no obvious path here.
  // Leaving a placeholder in place means the day someone swaps in a real CDN
  // they silently remove a protection nobody knew was load bearing.
  //
  // Adding a remote host needs BOTH this and `img-src` in src/securityHeaders.ts:
  // the CSP is `img-src 'self' data: blob:`, so a host allowed only here would
  // pass the optimizer and still be blocked by the browser. The test in
  // __tests__/config/remoteImages.test.ts fails if the two ever disagree.
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
