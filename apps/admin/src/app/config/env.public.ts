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
const appOrigin = requiredPublic('NEXT_PUBLIC_APP_ORIGIN', process.env.NEXT_PUBLIC_APP_ORIGIN);

// In production the origin must be https: SuperTokens derives the session
// cookie's `Secure` flag from it, so an http origin would issue insecure cookies.
if (process.env.NODE_ENV === 'production' && !appOrigin.startsWith('https://')) {
  throw new Error(
    'NEXT_PUBLIC_APP_ORIGIN must use https in production so session cookies are marked Secure.'
  );
}

export const publicEnv = {
  appOrigin,
};
