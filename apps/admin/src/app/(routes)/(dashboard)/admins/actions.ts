'use server';

import { revalidatePath } from 'next/cache';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import { isBootstrapAdmin, isConfirmedBootstrapAdmin } from '@/app/features/users/bootstrap';

export async function revokeAdminAction(formData: FormData) {
  const { userId: callerId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  if (userId === callerId) return;
  if (await isBootstrapAdmin(userId)) return;

  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  const admins = roleHolders.status === 'OK' ? roleHolders.users : [];
  if (admins.length <= 1) return;

  // The count and removal are separate SuperTokens operations, so two admins
  // could otherwise revoke each other after both observed a count of two. A
  // bootstrap role holder is configuration-owned and cannot be revoked through
  // this action, making it the stable survivor across concurrent requests and
  // across separate server instances. If none currently holds the role, fail
  // closed until one signs in and the bootstrap grant is restored.
  const bootstrapChecks = await Promise.all(
    admins.map((adminId) => isConfirmedBootstrapAdmin(adminId))
  );
  if (!bootstrapChecks.some(Boolean)) return;

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
