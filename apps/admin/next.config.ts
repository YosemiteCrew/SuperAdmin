import type { NextConfig } from 'next';
import { securityHeaders } from './src/securityHeaders';

const nextConfig: NextConfig = {
  // Keep Prisma out of the bundle so its query engine binary is traced from
  // node_modules instead. Without this the engine can be left out of the
  // deployed artifact, and every query fails at runtime with
  // PrismaClientInitializationError while the build itself stays green.
  serverExternalPackages: ['@prisma/client', '.prisma/client'],
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
