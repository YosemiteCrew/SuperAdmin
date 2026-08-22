import { config } from '@/app/config';

/**
 * Which platform backend a page is reading from. The panel is deliberately able
 * to talk to both: production is what pet parents actually see, development is
 * where the same screens can be exercised without changing anything real.
 *
 * Production is the default everywhere — a missing or unrecognised `env` query
 * param must never silently point a reviewer at dev data while the page header
 * claims otherwise.
 */
export const API_ENVIRONMENTS = ['production', 'development'] as const;

export type ApiEnvironment = (typeof API_ENVIRONMENTS)[number];

export const DEFAULT_API_ENVIRONMENT: ApiEnvironment = 'production';

export const API_ENVIRONMENT_META: Readonly<
  Record<ApiEnvironment, { label: string; hint: string }>
> = {
  production: { label: 'Production', hint: 'Live data — changes affect pet parents' },
  development: { label: 'Development', hint: 'Dev data — safe to experiment' },
};

/** Narrows an untrusted query-string value, falling back to production. */
export function parseApiEnvironment(value: string | string[] | undefined): ApiEnvironment {
  const raw = Array.isArray(value) ? value[0] : value;
  return API_ENVIRONMENTS.includes(raw as ApiEnvironment)
    ? (raw as ApiEnvironment)
    : DEFAULT_API_ENVIRONMENT;
}

/** Base URL for an environment, or '' when that environment is unprovisioned. */
export function apiBaseUrl(environment: ApiEnvironment): string {
  return config.api.baseUrls[environment];
}

/**
 * Whether the host has a URL for this environment at all. Used to grey out a
 * switcher tab rather than letting it produce "Failed to parse URL from /v1/...".
 */
export function isApiEnvironmentConfigured(environment: ApiEnvironment): boolean {
  return apiBaseUrl(environment).length > 0;
}

/** Adds `env` to a query string only when it differs from the default. */
export function appendApiEnvironment(qs: URLSearchParams, environment: ApiEnvironment): void {
  if (environment !== DEFAULT_API_ENVIRONMENT) qs.set('env', environment);
}
