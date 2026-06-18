import { httpClient } from '@/app/services/http/client';

import type { ListOrganizationsResponse, SuperAdminOrganization } from '../types';

/**
 * Reads tenant ("business") records from the platform backend's super-admin API.
 * Wired against `GET /v1/super-admin/businesses`; resolves once NEXT_PUBLIC_API_URL
 * points at the Yosemite backend.
 */
export async function listOrganizations(signal?: AbortSignal): Promise<SuperAdminOrganization[]> {
  const { data } = await httpClient.get<ListOrganizationsResponse>('/v1/super-admin/businesses', {
    signal,
  });
  return data.businesses ?? [];
}
