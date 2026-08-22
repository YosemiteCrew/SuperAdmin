export const config = {
  app: {
    name: 'Superadmin Panel',
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.1',
  },
  api: {
    // Default target for anything that does not ask for a specific environment.
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
    /**
     * Both platform backends, so a reviewer can switch between them in the UI.
     * These must stay as literal `process.env.NEXT_PUBLIC_*` member reads —
     * Next inlines those at build time, and a dynamic lookup would compile to
     * `undefined` in the browser bundle.
     */
    baseUrls: {
      production: process.env.NEXT_PUBLIC_API_URL ?? '',
      development: process.env.NEXT_PUBLIC_DEV_API_URL ?? '',
    },
    timeout: 30_000,
  },
} as const;
