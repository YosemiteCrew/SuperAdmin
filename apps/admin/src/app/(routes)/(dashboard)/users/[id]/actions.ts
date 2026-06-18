'use server';

import { revalidatePath } from 'next/cache';
import SessionNode from 'supertokens-node/recipe/session';
import TotpNode from 'supertokens-node/recipe/totp';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';

export async function revokeSessionAction(formData: FormData) {
  await requireSuperAdmin();

  const sessionHandle = formData.get('sessionHandle');
  const userId = formData.get('userId');
  if (typeof sessionHandle !== 'string' || typeof userId !== 'string') return;

  await SessionNode.revokeSession(sessionHandle);
  revalidatePath(`/users/${userId}`);
}

export async function revokeAllSessionsAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string') return;

  await SessionNode.revokeAllSessionsForUser(userId);
  revalidatePath(`/users/${userId}`);
}

/**
 * Recovery path for a super-admin who has lost their authenticator. Because TOTP
 * is mandatory, removing the device alone would still leave the live session
 * "MFA complete"; we also revoke every session so the next sign-in forces a
 * fresh TOTP enrollment via the standard /auth/mfa/totp flow.
 */
export async function resetMfaAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  const { devices } = await TotpNode.listDevices(userId);
  await Promise.all(devices.map((device) => TotpNode.removeDevice(userId, device.name)));

  await SessionNode.revokeAllSessionsForUser(userId);
  revalidatePath(`/users/${userId}`);
}

export async function grantSuperAdminAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await UserRolesNode.createNewRoleOrAddPermissions(SUPERADMIN_ROLE, []);
  await UserRolesNode.addRoleToUser(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
  revalidatePath(`/users/${userId}`);
}

export async function revokeSuperAdminAction(formData: FormData) {
  const { userId: callerId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  // Guard 1: an admin can never strip their own access (self-lockout).
  if (userId === callerId) return;

  // Guard 2: never remove the final super admin — keep at least one standing.
  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  const admins = roleHolders.status === 'OK' ? roleHolders.users : [];
  if (admins.length <= 1) return;

  await UserRolesNode.removeUserRole(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
  revalidatePath(`/users/${userId}`);
}
