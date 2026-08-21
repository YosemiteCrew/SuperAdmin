import type { NextConfig } from 'next';
import { securityHeaders } from './src/securityHeaders';

const nextConfig: NextConfig = {
  // Keep Prisma out of the bundle so its query engine binary is traced from
  // node_modules instead, rather than being left out of the deployed artifact.
  //
  // Only real package names belong here. '.prisma/client' was listed too and
  // broke EVERY route handler with a 500 - it is a generated directory, not a
  // resolvable specifier, so marking it external makes Next emit a require()
  // for it that throws at module load. Pages kept rendering, which is what
  // made it look like a Prisma problem rather than a config one.
  serverExternalPackages: ['@prisma/client'],
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
