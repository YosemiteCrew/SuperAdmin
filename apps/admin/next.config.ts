import type { NextConfig } from 'next';
import { securityHeaders } from './src/securityHeaders';

const nextConfig: NextConfig = {
  // NO serverExternalPackages here. Marking @prisma/client external makes
  // Turbopack emit a HASHED specifier that does not exist at runtime, and the
  // whole server chunk then fails to load - taking every route handler with
  // it, including ones that never touch Prisma:
  //
  //   Error: Failed to load external module @prisma/client-2c3a283f134fdcb6:
  //   Cannot find module '@prisma/client-2c3a283f134fdcb6'
  //   Require stack:
  //     - .next/server/chunks/[turbopack]_runtime.js
  //     - .next/server/app/api/ap/revoked.json/route.js
  //
  // Letting Next bundle Prisma normally is what worked before. The query
  // engine is handled by generating into node_modules and pinning
  // binaryTargets, not by externalising the package.
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
