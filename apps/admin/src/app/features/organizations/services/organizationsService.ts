import { httpClient } from '@/app/services/http/client';

import type {
  GetOrganizationResponse,
  ListOrganizationMembersResponse,
  ListOrganizationsResponse,
  OrganizationStatusPatch,
  SuperAdminOrganization,
  SuperAdminOrganizationDetail,
  SuperAdminOrganizationMember,
} from '../types';

type OrganizationRequestConfig = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Targets a specific platform backend; omit for the default one. */
  baseUrl?: string;
};

/**
 * Reads tenant ("business") records from the platform backend's super-admin API.
 * Wired against `GET /v1/super-admin/businesses`; resolves once NEXT_PUBLIC_API_URL
 * points at the Yosemite backend.
 */
export async function listOrganizations(
  requestConfig?: OrganizationRequestConfig
): Promise<SuperAdminOrganization[]> {
  const { data } = await httpClient.get<ListOrganizationsResponse>('/v1/super-admin/businesses', {
    ...requestConfig,
  });
  return data.businesses ?? [];
}

/** Reads a single business by id from `GET /v1/super-admin/businesses/:id`. */
export async function getOrganization(
  id: string,
  requestConfig?: OrganizationRequestConfig
): Promise<SuperAdminOrganizationDetail> {
  const { data } = await httpClient.get<GetOrganizationResponse>(
    `/v1/super-admin/businesses/${encodeURIComponent(id)}`,
    requestConfig
  );
  return data.business;
}

/**
 * Updates a business's verification/active flags via
 * `PATCH /v1/super-admin/businesses/:id`. `isVerified: true` is what makes a
 * business visible to pet parents in the mobile app; `isActive: false` suspends it.
 */
export async function updateOrganization(
  id: string,
  patch: OrganizationStatusPatch,
  requestConfig?: OrganizationRequestConfig
): Promise<void> {
  await httpClient.patch(
    `/v1/super-admin/businesses/${encodeURIComponent(id)}`,
    patch,
    requestConfig
  );
}

/**
 * Reads an organisation's active members from
 * `GET /v1/super-admin/businesses/:id/members`.
 *
 * The detail page has only ever shown `memberCount`, which cannot answer "who
 * is in this clinic" - the question every account-level diagnosis starts from.
 */
export async function listOrganizationMembers(
  id: string,
  requestConfig?: OrganizationRequestConfig
): Promise<SuperAdminOrganizationMember[]> {
  const { data } = await httpClient.get<ListOrganizationMembersResponse>(
    `/v1/super-admin/businesses/${encodeURIComponent(id)}/members`,
    requestConfig
  );
  return data.members ?? [];
}
