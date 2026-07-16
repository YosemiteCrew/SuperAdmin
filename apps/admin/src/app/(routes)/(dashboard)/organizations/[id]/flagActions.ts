'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { FEATURE_FLAGS, type FeatureFlagKey } from '@/app/features/feature-flags/constants';
import { setOrgFlag } from '@/app/features/feature-flags/store';

const VALID_FLAG_KEYS = new Set<string>(Object.keys(FEATURE_FLAGS));

export async function toggleFlagAction(formData: FormData): Promise<void> {
  const { userId: actorId } = await requireSuperAdmin();

  const orgId = formData.get('orgId');
  const flag = formData.get('flag');
  const value = formData.get('value') === 'true';

  if (typeof orgId !== 'string' || orgId.trim().length === 0) return;
  if (typeof flag !== 'string' || !VALID_FLAG_KEYS.has(flag)) return;

  await setOrgFlag(orgId, flag as FeatureFlagKey, value);
  await recordAuditEvent({
    action: value ? 'org.flag_on' : 'org.flag_off',
    actorId,
    targetType: 'organization',
    targetId: orgId,
    targetLabel: FEATURE_FLAGS[flag as FeatureFlagKey].label,
  });
  revalidatePath(`/organizations/${orgId}`);
}
