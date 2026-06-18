import { httpClient } from '@/app/services/http/client';

import type {
  ListOrganizationsResponse,
  OrganizationStatusPatch,
  SuperAdminOrganization,
} from '../types';

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

/**
 * Updates a business's verification/active flags via
 * `PATCH /v1/super-admin/businesses/:id`. `isVerified: true` is what makes a
 * business visible to pet parents in the mobile app; `isActive: false` suspends it.
 */
export async function updateOrganization(
  id: string,
  patch: OrganizationStatusPatch
): Promise<void> {
  await httpClient.patch(`/v1/super-admin/businesses/${encodeURIComponent(id)}`, patch);
}
