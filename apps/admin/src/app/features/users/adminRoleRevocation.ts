import 'server-only';

import UserRolesNode from 'supertokens-node/recipe/userroles';

import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';

import { isBootstrapAdmin, isConfirmedBootstrapAdmin } from './bootstrap';

/** Shared authorization boundary for every UI path that removes the superadmin role. */
export async function canRevokeSuperAdminRole(
  callerId: string,
  targetId: string
): Promise<boolean> {
  if (targetId === callerId || (await isBootstrapAdmin(targetId))) return false;

  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  if (roleHolders.status !== 'OK' || roleHolders.users.length <= 1) return false;

  // A bootstrap role holder cannot be revoked through either UI action, so it
  // remains a stable survivor across opposing requests and server instances.
  const bootstrapChecks = await Promise.all(
    roleHolders.users.map((adminId) => isConfirmedBootstrapAdmin(adminId))
  );
  return bootstrapChecks.some(Boolean);
}
