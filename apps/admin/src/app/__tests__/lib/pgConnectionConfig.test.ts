import 'server-only';

import { pgConnectionConfig, parseSchemaFromUrl } from '@superadmin/database';

const SUPABASE_SESSION_POOLER =
  'postgres://postgres.abcdefghijklmnop:password@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?schema=superadmin';
const SUPABASE_TRANSACTION_POOLER =
  'postgres://postgres.abcdefghijklmnop:password@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?schema=superadmin';
const LOCAL_POSTGRES = 'postgres://user:pass@localhost:5432/mydb?schema=superadmin';
const NO_SCHEMA = 'postgres://user:pass@localhost:5432/mydb';

describe('pgConnectionConfig', () => {
  it('parses a Supabase session pooler URL with ssl rejectUnauthorized: false', () => {
    const cfg = pgConnectionConfig(SUPABASE_SESSION_POOLER);
    expect(cfg).toEqual({
      host: 'aws-1-eu-central-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.abcdefghijklmnop',
      password: 'password',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('parses a Supabase transaction pooler URL the same way', () => {
    const cfg = pgConnectionConfig(SUPABASE_TRANSACTION_POOLER);
    expect(cfg.host).toBe('aws-1-eu-central-1.pooler.supabase.com');
    expect(cfg.port).toBe(6543);
    expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('parses a local Postgres URL with ssl: false', () => {
    const cfg = pgConnectionConfig(LOCAL_POSTGRES);
    expect(cfg).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'user',
      password: 'pass',
      database: 'mydb',
      ssl: false,
    });
  });

  it('defaults to port 5432 when not specified', () => {
    const cfg = pgConnectionConfig('postgres://user:pass@localhost/mydb');
    expect(cfg.port).toBe(5432);
  });

  it('defaults database to postgres when not specified', () => {
    const cfg = pgConnectionConfig('postgres://user:pass@localhost:5432/');
    expect(cfg.database).toBe('postgres');
  });
});

describe('parseSchemaFromUrl', () => {
  it('extracts schema=superadmin from the query string', () => {
    expect(parseSchemaFromUrl(SUPABASE_SESSION_POOLER)).toBe('superadmin');
  });

  it('returns public when no schema parameter is present', () => {
    expect(parseSchemaFromUrl(NO_SCHEMA)).toBe('public');
  });
});
