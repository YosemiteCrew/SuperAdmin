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
};
