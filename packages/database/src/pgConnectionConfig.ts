import 'server-only';

/**
 * Builds the connection options for a raw Postgres connection from a DATABASE_URL.
 * This is the SINGLE SOURCE OF TRUTH for how the panel connects to Postgres.
 * Both the approvals lock (when it lands) and the Prisma driver adapter MUST use
 * this function so there is only one place that decides SSL, host parsing, etc.
 *
 * The returned object is compatible with node-postgres (pg) and Prisma's
 * PrismaPg adapter.
 */
export function pgConnectionConfig(databaseUrl: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: { rejectUnauthorized: false } | false;
  // connectionTimeoutMillis is intentionally NOT included here.
  // The adapter adds its own 5s timeout (see client.ts).
} {
  const url = new URL(databaseUrl);

  // Supabase session pooler requires SSL with rejectUnauthorized: false
  // because the cert is for *.pooler.supabase.com, not the exact host.
  const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');

  return {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1) || 'postgres',
    ssl: isSupabasePooler ? { rejectUnauthorized: false } : false,
  };
}

/**
 * Parses the schema parameter from DATABASE_URL if present.
 * Returns 'public' if not specified (matching Prisma default).
 */
export function parseSchemaFromUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const params = new URLSearchParams(url.search);
  return params.get('schema') || 'public';
}
