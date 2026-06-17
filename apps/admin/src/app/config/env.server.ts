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

export const serverEnv = {
  supertokensConnectionUri: requiredServer(
    'SUPERTOKENS_CONNECTION_URI',
    process.env.SUPERTOKENS_CONNECTION_URI
  ),
  supertokensApiKey: requiredServer('SUPERTOKENS_API_KEY', process.env.SUPERTOKENS_API_KEY),
};
