'use server';

import supertokens from 'supertokens-node';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { listOrganizations } from '@/app/features/organizations/services/organizationsService';

export interface DirectoryHit {
  id: string;
  kind: 'user' | 'organization';
  title: string;
  href: string;
}

const MIN_QUERY = 2;
const MAX_QUERY = 100;
const MAX_HITS_PER_KIND = 5;
const DEFAULT_TENANT = 'public';

async function searchUsers(q: string): Promise<DirectoryHit[]> {
  try {
    const { users } = await supertokens.getUsersNewestFirst({
      tenantId: DEFAULT_TENANT,
      limit: MAX_HITS_PER_KIND,
      query: { email: q },
    });
    return users
      .filter((u) => u.emails[0])
      .map((u) => ({
        id: u.id,
        kind: 'user' as const,
        title: u.emails[0],
        href: `/users/${u.id}`,
      }));
  } catch {
    return [];
  }
}

async function searchOrgs(q: string): Promise<DirectoryHit[]> {
  try {
    const orgs = await listOrganizations();
    const needle = q.toLowerCase();
    return orgs
      .filter((org) => org.name.toLowerCase().includes(needle))
      .slice(0, MAX_HITS_PER_KIND)
      .map((org) => ({
        id: org.id,
        kind: 'organization' as const,
        title: org.name,
        href: `/organizations/${org.id}`,
      }));
  } catch {
    // The businesses backend may be unreachable; user hits still return.
    return [];
  }
}

/**
 * Live directory search behind the command palette. Server action = public
 * POST endpoint, so it enforces the full super-admin gate itself and treats
 * the query as untrusted input.
 */
export async function searchDirectoryAction(rawQuery: string): Promise<DirectoryHit[]> {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  if (typeof rawQuery !== 'string') return [];
  const q = rawQuery.trim().slice(0, MAX_QUERY);
  if (q.length < MIN_QUERY) return [];

  const [users, orgs] = await Promise.all([searchUsers(q), searchOrgs(q)]);
  return [...users, ...orgs];
}
