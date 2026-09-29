import 'server-only';

import { headers } from 'next/headers';

import { type ApiEnvironment, apiBaseUrl } from '@/app/config/apiEnvironment';

import { DEMO_ORGANIZATIONS } from './demo';
import { listOrganizations } from './services/organizationsService';
import type { SuperAdminOrganization } from './types';

export function buildLoadErrorMessage(
  baseUrl: string,
  environment: ApiEnvironment,
  detail?: string
): string {
  const envVar = environment === 'production' ? 'NEXT_PUBLIC_API_URL' : 'NEXT_PUBLIC_DEV_API_URL';
  const resolvedBaseUrl = baseUrl || `(empty ${envVar})`;
  const message = `Couldn't reach the platform backend at ${resolvedBaseUrl}/v1/super-admin/businesses.`;
  return detail ? `${message} Error: ${detail}` : message;
}

/**
 * Lists businesses from one platform backend with the admin's own session
 * cookie. A failure is returned, not thrown, so each page can say which
 * backend could not be reached and still render.
 */
export async function loadOrganizations(
  demo: boolean,
  environment: ApiEnvironment
): Promise<{
  organizations: SuperAdminOrganization[];
  loadError: boolean;
  loadErrorDetail?: string;
}> {
  if (demo) return { organizations: DEMO_ORGANIZATIONS, loadError: false };
  try {
    const cookie = (await headers()).get('cookie') ?? '';
    return {
      organizations: await listOrganizations({
        headers: { cookie },
        baseUrl: apiBaseUrl(environment),
      }),
      loadError: false,
    };
  } catch (error) {
    return {
      organizations: [],
      loadError: true,
      loadErrorDetail: error instanceof Error ? error.message : String(error),
    };
  }
}
