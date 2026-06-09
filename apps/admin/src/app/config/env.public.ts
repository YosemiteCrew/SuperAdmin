function requiredPublic(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required public env var: ${name}. ` +
        `Add it to apps/admin/.env.local (see .env.example) and restart the dev server.`
    );
  }
  return value;
}

// Each NEXT_PUBLIC_* must be read by direct property access so Next.js can
// statically inline it at build time. Indirect access (process.env[name])
// breaks client-side inlining.
export const publicEnv = {
  appOrigin: requiredPublic('NEXT_PUBLIC_APP_ORIGIN', process.env.NEXT_PUBLIC_APP_ORIGIN),
};
