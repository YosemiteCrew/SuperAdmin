import { lookup as dnsLookupCb, type LookupAddress, type LookupOptions } from 'node:dns';
import { lookup as dnsLookupAsync } from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';

import type { OrganizationAddress, SuperAdminOrganizationDetail } from './types';

/** Resolves a hostname to its IP addresses. Injectable so tests stay hermetic. */
export type HostResolver = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultResolver: HostResolver = (hostname) => dnsLookupAsync(hostname, { all: true });

/** Cap on redirect hops we will follow (each re-validated against the SSRF guard). */
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 2_000_000;

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skipped';

export interface CorroborationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export type CorroborationLevel = 'corroborated' | 'partial' | 'unverified';

export interface CorroborationResult {
  level: CorroborationLevel;
  checks: CorroborationCheck[];
}

// 10/8, 127/8, 0/8, 169.254/16 (link-local), 192.168/16, 172.16/12,
// 100.64/10 (CGNAT), and 224+/multicast+reserved.
const PRIVATE_IPV4 =
  /^(?:10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|(?:22[4-9]|2[3-5]\d)\.)/;

/**
 * Classifies an IP literal (IPv4 dotted, IPv6, or IPv4-mapped IPv6) as private,
 * loopback, link-local, or otherwise non-public. The WHATWG URL parser already
 * normalizes decimal/hex/octal IPv4 to dotted form, so by the time a host
 * reaches here those encodings are canonical.
 */
function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^\[|\]$/g, '').toLowerCase();
  // IPv4-mapped IPv6 in dotted tail form (e.g. ::ffff:127.0.0.1).
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (mapped) return PRIVATE_IPV4.test(mapped[1]);
  if (v.includes('.') && !v.includes(':')) return PRIVATE_IPV4.test(v);
  // IPv6: loopback, unspecified, ULA (fc/fd), link-local (fe80), and any other
  // IPv4-mapped form (hex tail) are all treated as non-public.
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
  return v.startsWith('::ffff:');
}

/**
 * Parses an external website URL and rejects anything that isn't a public
 * http(s) endpoint — the first layer of the SSRF guard, since the URL is
 * supplied by the business. The resolved IP is also validated at fetch time
 * (see `checkWebsite`), and redirects are followed manually and re-checked.
 */
export function isPublicHttpUrl(raw?: string): URL | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  // A leading "scheme:" means the user supplied a protocol — keep it so the
  // http(s)-only check below can reject non-http schemes (ftp:, javascript:, …).
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return null;
  }
  if (isPrivateIp(host)) return null;

  return url;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/** Index just past `closing` (case-insensitive), or end of string if absent. */
function skipBlock(lower: string, from: number, closing: string): number {
  const end = lower.indexOf(closing, from);
  return end === -1 ? lower.length : end + closing.length;
}

/**
 * Strips tags (and script/style bodies) from HTML using a single linear scan.
 * Avoids regular expressions entirely, so there is no backtracking/ReDoS risk
 * on attacker-influenced page content.
 */
function stripHtml(html: string): string {
  const lower = html.toLowerCase();
  let out = '';
  let i = 0;
  while (i < lower.length) {
    if (lower[i] !== '<') {
      out += lower[i];
      i += 1;
    } else if (lower.startsWith('<script', i)) {
      i = skipBlock(lower, i, '</script>');
    } else if (lower.startsWith('<style', i)) {
      i = skipBlock(lower, i, '</style>');
    } else {
      const close = lower.indexOf('>', i + 1);
      i = close === -1 ? lower.length : close + 1;
    }
  }
  return out;
}

type FetchLikeResponse = Pick<Response, 'ok' | 'status'> & {
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

/**
 * A DNS lookup that validates the resolved address and PINS the socket to it:
 * the connection uses exactly the IP we checked, so a hostname can't resolve to
 * a public IP for the guard and a private one for the actual connect (the
 * DNS-rebinding TOCTOU). Rejects private/loopback/reserved addresses.
 */
export function pinningLookup(
  isBlocked: (ip: string) => boolean,
  resolve: typeof dnsLookupCb = dnsLookupCb
): LookupFunction {
  const fn = (
    hostname: string,
    options: LookupOptions,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number
    ) => void
  ): void => {
    // Pass node's own `options` through unchanged so the returned shape matches
    // what it requested (single address vs. all), then validate before handing
    // the SAME result back — the socket connects to exactly this checked IP.
    resolve(hostname, options, (err, address, family) => {
      if (err) {
        callback(err, '', 0);
        return;
      }
      const list = Array.isArray(address) ? address : [{ address, family } as LookupAddress];
      if (list.length === 0 || list.some((entry) => isBlocked(entry.address))) {
        callback(new Error('blocked non-public address') as NodeJS.ErrnoException, '', 0);
        return;
      }
      callback(null, address, family);
    });
  };
  return fn as LookupFunction;
}

/**
 * Single GET over a connection pinned to a validated IP. Does not follow
 * redirects (the caller re-validates each hop) and caps the response body.
 */
function pinnedRequest(
  urlStr: string,
  signal: AbortSignal | undefined,
  isBlocked: (ip: string) => boolean
): Promise<FetchLikeResponse> {
  const url = new URL(urlStr);
  const send = url.protocol === 'http:' ? httpRequest : httpsRequest;
  return new Promise<FetchLikeResponse>((resolve, reject) => {
    const req = send(
      url,
      { method: 'GET', lookup: pinningLookup(isBlocked), signal },
      (res: IncomingMessage) => {
        const status = res.statusCode ?? 0;
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BODY_BYTES) {
            req.destroy(new Error('response too large'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: status >= 200 && status < 300,
            status,
            headers: {
              get: (name) => {
                const value = res.headers[name.toLowerCase()];
                return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
              },
            },
            text: () => Promise.resolve(body),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * Default website fetcher used in production: pins the connection to a validated
 * public IP. Exposed as a factory so tests can pass a permissive `isBlocked`
 * (to reach a loopback test server). `fetch`-compatible enough for `checkWebsite`.
 */
export function createPinnedFetch(isBlocked: (ip: string) => boolean = isPrivateIp): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    pinnedRequest(String(input), init?.signal ?? undefined, isBlocked)) as unknown as typeof fetch;
}

/**
 * Resolves a hostname and throws if any resolved address is private/loopback —
 * a pre-connect SSRF layer. The actual connection is additionally pinned to a
 * validated IP (see `pinningLookup`), which closes the resolve→connect TOCTOU.
 */
async function assertResolvesPublic(hostname: string, resolveImpl: HostResolver): Promise<void> {
  const records = await resolveImpl(hostname);
  if (records.length === 0 || records.some((r) => isPrivateIp(r.address))) {
    throw new Error('host resolves to a non-public address');
  }
}

/**
 * Fetches `start`, following up to MAX_REDIRECTS hops manually. Every hop is
 * re-validated through `isPublicHttpUrl` and its resolved IP re-checked, so an
 * attacker cannot bounce a public URL into the internal network via a redirect.
 */
async function fetchFollowingSafely(
  start: URL,
  fetchImpl: typeof fetch,
  resolveImpl: HostResolver
): Promise<Response> {
  let current: URL = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertResolvesPublic(current.hostname, resolveImpl);
    const res = await fetchImpl(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout?.(FETCH_TIMEOUT_MS),
    });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get('location');
    const next = location ? isPublicHttpUrl(new URL(location, current).toString()) : null;
    if (!next) throw new Error('blocked or invalid redirect target');
    current = next;
  }
  throw new Error('too many redirects');
}

/**
 * Fetches the business website and checks that the rendered text mentions the
 * business name. `fetchImpl` and `resolveImpl` are injectable for testing.
 */
export async function checkWebsite(
  website: string | undefined,
  name: string,
  fetchImpl: typeof fetch,
  resolveImpl: HostResolver = defaultResolver
): Promise<CorroborationCheck> {
  const url = isPublicHttpUrl(website);
  if (!url) {
    return {
      id: 'website',
      label: 'Website',
      status: website ? 'fail' : 'skipped',
      detail: website ? 'Not a valid public URL.' : 'No website provided.',
    };
  }

  try {
    const res = await fetchFollowingSafely(url, fetchImpl, resolveImpl);
    if (!res.ok) {
      return {
        id: 'website',
        label: 'Website',
        status: 'fail',
        detail: `Returned HTTP ${res.status}.`,
      };
    }
    const text = stripHtml(await res.text());
    const tokens = tokenize(name);
    const matched = tokens.filter((t) => text.includes(t));
    if (tokens.length > 0 && matched.length / tokens.length >= 0.5) {
      return {
        id: 'website',
        label: 'Website',
        status: 'pass',
        detail: 'Live, and the page mentions the business name.',
      };
    }
    return {
      id: 'website',
      label: 'Website',
      status: 'warn',
      detail: 'Live, but the page does not clearly mention the business name.',
    };
  } catch {
    return {
      id: 'website',
      label: 'Website',
      status: 'fail',
      detail: 'Could not reach the website.',
    };
  }
}

function hasAddress(address?: OrganizationAddress): boolean {
  return Boolean(address && (address.addressLine || address.city) && address.country);
}

function presenceCheck(
  id: string,
  label: string,
  present: boolean,
  detail: string
): CorroborationCheck {
  return { id, label, status: present ? 'pass' : 'warn', detail };
}

function structuralChecks(org: SuperAdminOrganizationDetail): CorroborationCheck[] {
  const hasCert = Boolean(
    org.healthAndSafetyCertNo || org.animalWelfareComplianceCertNo || org.fireAndEmergencyCertNo
  );
  return [
    presenceCheck(
      'phone',
      'Phone',
      Boolean(org.phoneNo),
      org.phoneNo ? 'Contact number on file.' : 'No phone number.'
    ),
    presenceCheck(
      'address',
      'Address',
      hasAddress(org.address),
      hasAddress(org.address) ? 'Postal address on file.' : 'Address incomplete.'
    ),
    presenceCheck(
      'taxId',
      'Tax ID',
      Boolean(org.taxId),
      org.taxId ? 'Tax ID provided.' : 'No tax ID.'
    ),
    presenceCheck(
      'certs',
      'Compliance certs',
      hasCert,
      hasCert ? 'At least one compliance certificate.' : 'No compliance certificates.'
    ),
    presenceCheck(
      'places',
      'Google Places',
      Boolean(org.googlePlacesId),
      org.googlePlacesId ? 'Linked to a Google Places listing.' : 'Not linked to Google Places.'
    ),
  ];
}

function aggregate(checks: CorroborationCheck[]): CorroborationLevel {
  const website = checks.find((c) => c.id === 'website');
  const structuralPass = checks.filter((c) => c.id !== 'website' && c.status === 'pass').length;
  const websitePass = website?.status === 'pass';

  if (websitePass && structuralPass >= 3) return 'corroborated';
  if (websitePass || structuralPass >= 3) return 'partial';
  return 'unverified';
}

/**
 * Runs every corroboration check for a business and aggregates a confidence
 * level. The website check performs a real outbound request via `fetchImpl`.
 */
export async function corroborateBusiness(
  org: SuperAdminOrganizationDetail,
  fetchImpl: typeof fetch = createPinnedFetch(),
  resolveImpl: HostResolver = defaultResolver
): Promise<CorroborationResult> {
  const website = await checkWebsite(org.website, org.name, fetchImpl, resolveImpl);
  const checks = [website, ...structuralChecks(org)];
  return { level: aggregate(checks), checks };
}

export const CORROBORATION_META: Record<CorroborationLevel, { label: string; badgeClass: string }> =
  {
    corroborated: { label: 'Details corroborated', badgeClass: 'bg-success-100 text-success-700' },
    partial: { label: 'Partly corroborated', badgeClass: 'bg-warning-100 text-warning-800' },
    unverified: { label: 'Not corroborated', badgeClass: 'bg-raised text-ink-2' },
  };
