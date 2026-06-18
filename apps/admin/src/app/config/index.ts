export const config = {
  app: {
    name: 'Superadmin Panel',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.1',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
    timeout: 30_000,
  },
} as const;
