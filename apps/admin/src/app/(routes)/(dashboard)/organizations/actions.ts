'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { updateOrganization } from '@/app/features/organizations/services/organizationsService';
import type { OrganizationStatusPatch } from '@/app/features/organizations/types';

async function patchOrganization(
  formData: FormData,
  patch: OrganizationStatusPatch,
  action: AuditAction
): Promise<void> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('organizationId');
  if (typeof id !== 'string' || id.length === 0) return;

  const name = formData.get('organizationName');

  await updateOrganization(id, patch);
  await recordAuditEvent({
    action,
    actorId,
    targetType: 'organization',
    targetId: id,
    targetLabel: typeof name === 'string' && name.length > 0 ? name : undefined,
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
