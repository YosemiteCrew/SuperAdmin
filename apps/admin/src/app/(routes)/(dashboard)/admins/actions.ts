'use server';

import { revalidatePath } from 'next/cache';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';

export async function revokeAdminAction(formData: FormData) {
  const { userId: callerId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  if (userId === callerId) return;

  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  const admins = roleHolders.status === 'OK' ? roleHolders.users : [];
  if (admins.length <= 1) return;

  await UserRolesNode.removeUserRole(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
  await recordAuditEvent({
    action: 'role.revoke',
    actorId: callerId,
    targetType: 'user',
    targetId: userId,
  });
  revalidatePath('/admins');
  revalidatePath(`/users/${userId}`);
}
