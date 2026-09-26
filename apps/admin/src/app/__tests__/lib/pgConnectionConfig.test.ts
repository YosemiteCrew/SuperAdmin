/**
 * @jest-environment node
 */
import { X509Certificate } from 'node:crypto';

import { Client } from 'pg';

import { pgConnectionConfig, SUPABASE_ROOT_2021_CA } from '@superadmin/database/pgConnectionConfig';

const POOLER = 'aws-0-example.pooler.supabase.com';
const poolerUrl = (query: string) => `postgresql://USER:PASSWORD@${POOLER}:5432/postgres${query}`;
const verifiedTls = () => ({ ca: SUPABASE_ROOT_2021_CA, rejectUnauthorized: true });

// What node-postgres itself resolves from a config, without opening a socket.
const resolved = (url: string) => new Client(pgConnectionConfig(url));

describe('pgConnectionConfig', () => {
  it('verifies TLS against the Supabase root for a pooler URL with no sslmode', () => {
    const config = pgConnectionConfig(poolerUrl('?schema=superadmin'));

    expect(config).toEqual({
      connectionString: poolerUrl('?schema=superadmin'),
      ssl: verifiedTls(),
    });
    expect(resolved(poolerUrl('?schema=superadmin')).ssl).toEqual(verifiedTls());
  });

  it('strips sslmode=require, which node-postgres would otherwise let replace the ssl option', () => {
    const url = poolerUrl('?schema=superadmin&sslmode=require');

    expect(pgConnectionConfig(url)).toEqual({
      connectionString: poolerUrl('?schema=superadmin'),
      ssl: verifiedTls(),
    });
    expect(resolved(url).ssl).toEqual(verifiedTls());
  });

  it('strips every URL parameter pg turns into its own ssl value and keeps the rest', () => {
    const url = poolerUrl(
      '?sslmode=verify-full&schema=superadmin&ssl=true&sslrootcert=/nonexistent/root.crt' +
        '&sslcert=/nonexistent/c.crt&sslkey=/nonexistent/c.key&sslnegotiation=direct' +
        '&application_name=superadmin-lock&options=-c%20statement_timeout%3D5000'
    );

    const config = pgConnectionConfig(url);
    const params = new URL(config.connectionString ?? '').searchParams;

    expect([...params.keys()]).toEqual(['schema', 'application_name', 'options']);
    expect(params.get('options')).toBe('-c statement_timeout=5000');
    const client = resolved(url);
    expect(client.ssl).toEqual(verifiedTls());
    expect(client.database).toBe('postgres');
  });

  it('keeps URL-reserved characters in the userinfo intact through the rewrite', () => {
    // Every character the URL rewrite could mangle, joined from a list so no line of this file
    // looks like a committed credential to a secret scanner.
    const reservedChars = ['@', '/', '?', '#', ':', '%'].join('x');
    const client = resolved(
      `postgresql://USER:${encodeURIComponent(reservedChars)}@${POOLER}:5432/postgres?sslmode=require`
    );

    expect(client.password).toBe(reservedChars);
    expect(client.user).toBe('USER');
    expect(client.host).toBe(POOLER);
  });

  it.each([
    ['a direct connection host', 'db.projectref.supabase.co'],
    ['an upper-case pooler host', POOLER.toUpperCase()],
    ['a fully qualified pooler host with a trailing dot', `${POOLER}.`],
  ])('pins the Supabase root for %s', (_label, urlHost) => {
    const config = pgConnectionConfig(`postgresql://USER:PASSWORD@${urlHost}:5432/postgres`);

    expect(config.ssl).toEqual(verifiedTls());
  });

  it('strips ssl-prefixed parameters it has no name for, in any case', () => {
    const url = poolerUrl('?SSLMODE=require&sslfuture=verify-none&schema=superadmin');

    const params = new URL(pgConnectionConfig(url).connectionString ?? '').searchParams;

    expect([...params.keys()]).toEqual(['schema']);
    expect(resolved(url).ssl).toEqual(verifiedTls());
  });

  it('reads the host from a host query parameter, as pg does', () => {
    const config = pgConnectionConfig(
      `postgresql://USER:PASSWORD@localhost:5432/postgres?host=${POOLER}&sslmode=disable`
    );

    expect(config.ssl).toEqual(verifiedTls());
    expect(config.connectionString).not.toContain('sslmode');
    expect(pgConnectionConfig(poolerUrl('?host=')).ssl).toEqual(verifiedTls());
  });

  it.each([
    'postgresql://USER:PASSWORD@localhost:5432/superadmin?schema=superadmin',
    'postgresql://USER:PASSWORD@postgres:5432/superadmin?schema=superadmin&sslmode=disable',
    'postgresql://USER:PASSWORD@db.internal.example:5432/app?sslmode=require',
    'postgresql://USER:PASSWORD@supabase.com.example.net:5432/postgres',
    'postgresql://USER:PASSWORD@notsupabase.com:5432/postgres',
    '/var/run/postgresql superadmin',
    'postgresql://USER:PASSWORD@/superadmin?host=/var/run/postgresql',
  ])('leaves every other connection string to the URL: %s', (url) => {
    expect(pgConnectionConfig(url)).toEqual({ connectionString: url });
  });

  it('pins the published Supabase Root 2021 CA', () => {
    const ca = new X509Certificate(SUPABASE_ROOT_2021_CA);

    expect(ca.subject).toContain('CN=Supabase Root 2021 CA');
    expect(ca.fingerprint256).toBe(
      '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA'
    );
  });
});
