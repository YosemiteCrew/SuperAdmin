import 'server-only';

import { headers } from 'next/headers';

import { apiBaseUrl, parseApiEnvironment } from '@/app/config/apiEnvironment';
import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';

import { getOrganization } from './services/organizationsService';

export async function getOrganizationMetadataName(
  id: string,
  environment: string | undefined
): Promise<string | null> {
  ensureSuperTokensInit();
  await requireSuperAdmin();
  const cookie = (await headers()).get('cookie') ?? '';
  try {
    const organization = await getOrganization(id, {
      headers: { cookie },
      baseUrl: apiBaseUrl(parseApiEnvironment(environment)),
    });
    return organization.name;
  } catch {
    return null;
  }
}
