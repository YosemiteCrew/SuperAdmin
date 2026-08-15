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
  apSigningKey: process.env.AP_SIGNING_KEY ?? null,
  apSigningKeyId: process.env.AP_SIGNING_KEY_ID ?? 'yc-ap-2026-01',
  // Shared secret the mobile/web apps present when reporting consent decisions
  // to /api/consent. Optional — the endpoint refuses all writes when absent so
  // consent can never be recorded unauthenticated.
  consentIntakeKey: process.env.CONSENT_INTAKE_KEY ?? null,
  // Shared secret the marketing site presents when POSTing contact-us
  // submissions to /api/contact. Optional — the intake endpoint refuses all
  // requests when absent, so the form cannot silently start dropping leads.
  contactIntakeKey: process.env.CONTACT_INTAKE_KEY ?? null,
};
