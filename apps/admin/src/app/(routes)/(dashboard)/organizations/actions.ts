'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { updateOrganization } from '@/app/features/organizations/services/organizationsService';
import type { OrganizationStatusPatch } from '@/app/features/organizations/types';

async function patchOrganization(
  formData: FormData,
  patch: OrganizationStatusPatch
): Promise<void> {
  await requireSuperAdmin();

  const id = formData.get('organizationId');
  if (typeof id !== 'string' || id.length === 0) return;

  await updateOrganization(id, patch);
  revalidatePath('/organizations');
}

/** Verify a business — makes it visible to pet parents in the mobile app. */
export async function verifyOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isVerified: true });
}

/** Suspend a business — hides it from pet parents without deleting it. */
export async function suspendOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isActive: false });
}

/** Re-activate a previously suspended business. */
export async function reactivateOrganizationAction(formData: FormData): Promise<void> {
  await patchOrganization(formData, { isActive: true });
}
