'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import {
  DEFAULT_API_ENVIRONMENT,
  API_ENVIRONMENT_META,
  apiBaseUrl,
  parseApiEnvironment,
} from '@/app/config/apiEnvironment';
import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import {
  getOrganization,
  updateOrganization,
} from '@/app/features/organizations/services/organizationsService';
import type { OrganizationStatusPatch } from '@/app/features/organizations/types';

async function patchOrganization(
  formData: FormData,
  patch: OrganizationStatusPatch,
  action: AuditAction
): Promise<void> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('organizationId');
  if (typeof id !== 'string' || id.length === 0) return;

  const rawEnv = formData.get('env');
  const environment = parseApiEnvironment(typeof rawEnv === 'string' ? rawEnv : undefined);

  // The list page reads with the admin's session cookie; the mutation has to
  // present the same one or the platform backend rejects it as unauthenticated.
  const cookie = (await headers()).get('cookie') ?? '';
  const requestConfig = {
    headers: { cookie },
    baseUrl: apiBaseUrl(environment),
  };
  const organization = await getOrganization(id, requestConfig);
  await updateOrganization(id, patch, requestConfig);

  // The audit log must not imply a production change when the action ran against
  // dev. There is no metadata field on an audit event, and the audit files are
  // high-collision, so the environment rides along in the label — and only when
  // it is not production, leaving existing production entries byte-identical.
  const targetLabel =
    environment === DEFAULT_API_ENVIRONMENT
      ? organization.name
      : `${organization.name} [${API_ENVIRONMENT_META[environment].label}]`;

  await recordAuditEvent({
    action,
    actorId,
    targetType: 'organization',
    targetId: id,
    targetLabel,
  });
  revalidatePath('/organizations');
  revalidatePath(`/organizations/${id}`);
}

/** Verify a business — makes it visible to pet parents in the mobile app. */
export async function verifyOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isVerified: true }, 'org.verify');
}

/** Suspend a business — hides it from pet parents without deleting it. */
export async function suspendOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isActive: false }, 'org.suspend');
}

/** Re-activate a previously suspended business. */
export async function reactivateOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isActive: true }, 'org.reactivate');
}
