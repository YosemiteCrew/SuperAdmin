import 'server-only';

function requiredServer(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required server env var: ${name}. ` +
        `Add it to apps/admin/.env.local (see .env.example) and restart the dev server.`
    );
  }
  return value;
}

/**
 * Restores a PEM that was supplied on a single line with literal `\n` escapes.
 *
 * Amplify does not expose console env vars to the Next SSR runtime, so
 * `amplify.yml` materialises them with `env | grep -E '^(NAME|...)='`. That
 * extraction is line-based: a genuinely multi-line PEM survives only as far as
 * its `-----BEGIN PRIVATE KEY-----` header, and `createPrivateKey` then throws
 * at request time rather than at build time. Supplying the key single-line and
 * expanding it here keeps the value intact through that pipeline.
 *
 * A PEM pasted with real newlines is returned unchanged, so both forms work.
 */
function optionalPem(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const expanded = value.includes('\\n') ? value.replaceAll('\\n', '\n') : value;
  const trimmed = expanded.trim();
  return trimmed.length > 0 ? `${trimmed}\n` : null;
}

function optionalEmailList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export const serverEnv = {
  supertokensConnectionUri: requiredServer(
    'SUPERTOKENS_CONNECTION_URI',
    process.env.SUPERTOKENS_CONNECTION_URI
  ),
  supertokensApiKey: requiredServer('SUPERTOKENS_API_KEY', process.env.SUPERTOKENS_API_KEY),
  // Postgres connection string for the Prisma client. Prisma reads
  // process.env.DATABASE_URL itself, so nothing here consumes this value — it
  // is validated purely so a missing one fails at startup like every other
  // required var. Left unvalidated, the app boots reporting healthy, serves
  // sign-in and every SuperTokens-backed page, and then throws on each of the
  // Prisma-backed routes; in production the error boundary hides the message
  // behind a digest, so the panel looks selectively broken rather than
  // misconfigured.
  databaseUrl: requiredServer('DATABASE_URL', process.env.DATABASE_URL),
  superadminBootstrapEmails: optionalEmailList(process.env.SUPERADMIN_BOOTSTRAP_EMAILS),
  plunkApiKey: process.env.PLUNK_API_KEY ?? '',
  plunkApiEndpoint: process.env.PLUNK_API_ENDPOINT ?? 'https://api.useplunk.com',
  // ActivityPub federation: RSA private key PEM used to sign license JWTs.
  // Optional — AP token issuance is disabled when absent.
  apSigningKey: optionalPem(process.env.AP_SIGNING_KEY),
  apSigningKeyId: process.env.AP_SIGNING_KEY_ID ?? 'yc-ap-2026-01',
  // Shared secret the mobile/web apps present when reporting consent decisions
  // to /api/consent. Optional — the endpoint refuses all writes when absent so
  // consent can never be recorded unauthenticated.
  consentIntakeKey: process.env.CONSENT_INTAKE_KEY ?? null,
  // Shared secret the marketing site presents when POSTing contact-us
  // submissions to /api/contact. Optional — the intake endpoint refuses all
  // requests when absent, so the form cannot silently start dropping leads.
  contactIntakeKey: process.env.CONTACT_INTAKE_KEY ?? null,
  // Social poster (TikTok) credentials. Optional on purpose: the panel must
  // still boot on a host where the poster was never provisioned — the Social
  // page reports exactly which of these are missing rather than the whole app
  // failing to start. socialTokenKey seals the stored OAuth tokens at rest.
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? null,
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET ?? null,
  tiktokRedirectUri: process.env.TIKTOK_REDIRECT_URI ?? null,
  socialTokenKey: process.env.SOCIAL_TOKEN_KEY ?? null,
  // Shared secret the scheduled-posting cron presents to /api/social/tiktok/
  // scheduled. Optional — the endpoint refuses every request when absent, so an
  // unset key can never mean "unauthenticated posting to the company account".
  socialSchedulerKey: process.env.SOCIAL_SCHEDULER_KEY ?? null,
  // Instagram poster credentials. Optional for the same reason as TikTok's: the
  // panel must boot on a host where the poster was never provisioned. Note these
  // are the INSTAGRAM app id/secret from the use case's "API setup with Instagram
  // login" panel, not the Meta app id.
  instagramAppId: process.env.INSTAGRAM_APP_ID ?? null,
  instagramAppSecret: process.env.INSTAGRAM_APP_SECRET ?? null,
  instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI ?? null,
};
