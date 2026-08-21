import path from 'node:path';

import type { NextConfig } from 'next';
import { securityHeaders } from './src/securityHeaders';

const nextConfig: NextConfig = {
  // The Prisma client is generated into packages/database/src/generated/client
  // and imported by relative path, so Next BUNDLES it (see the schema comment -
  // importing it as "@prisma/client" instead would hit Next's built-in
  // externals list and break every route handler).
  //
  // Bundling the JS is not enough: the query engine is a .node binary loaded at
  // runtime through dynamic filesystem access, which tracing cannot follow. It
  // has to be named explicitly or it never reaches the compute bundle, and
  // every query fails with PrismaClientInitializationError while the build
  // stays green.
  //
  // tracingRoot must be the monorepo root; without it tracing will not look
  // outside apps/admin and the include below silently matches nothing.
  //
  // BOTH of these are inert unless the build runs on webpack. next/dist/build/
  // index.js guards the whole NFT step with
  //   if (bundler !== Bundler.Turbopack && ...) collectBuildTraces(...)
  // and collect-build-traces.js is the only reader of outputFileTracingIncludes.
  // Next 16 defaults `next build` to Turbopack, so the app's build script pins
  // --webpack. Drop that flag and the engine silently stops shipping again.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/**': ['../../packages/database/src/generated/client/**/*'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.yourdomain.com' }],
  },
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
