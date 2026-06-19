import type { OrganizationAddress, SuperAdminOrganizationDetail } from './types';

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

const PRIVATE_IPV4 = /^(?:10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

/**
 * Parses an external website URL and rejects anything that isn't a public
 * http(s) endpoint — a best-effort SSRF guard, since the URL is supplied by the
 * business. (Full protection also requires checking the resolved IP at fetch
 * time; this blocks the obvious loopback / private / link-local literals.)
 */
export function isPublicHttpUrl(raw?: string): URL | null {
  if (!raw || !raw.trim()) return null;
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
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return null;
  }
  if (PRIVATE_IPV4.test(host)) return null;

  return url;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase();
}

/**
 * Fetches the business website and checks that the rendered text mentions the
 * business name. `fetchImpl` is injectable for testing.
 */
export async function checkWebsite(
  website: string | undefined,
  name: string,
  fetchImpl: typeof fetch
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
    const res = await fetchImpl(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout?.(6000),
    });
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
  fetchImpl: typeof fetch = fetch
): Promise<CorroborationResult> {
  const website = await checkWebsite(org.website, org.name, fetchImpl);
  const checks = [website, ...structuralChecks(org)];
  return { level: aggregate(checks), checks };
}

export const CORROBORATION_META: Record<CorroborationLevel, { label: string; badgeClass: string }> =
  {
    corroborated: { label: 'Details corroborated', badgeClass: 'bg-success-100 text-success-700' },
    partial: { label: 'Partly corroborated', badgeClass: 'bg-warning-100 text-warning-800' },
    unverified: { label: 'Not corroborated', badgeClass: 'bg-raised text-ink-2' },
  };
