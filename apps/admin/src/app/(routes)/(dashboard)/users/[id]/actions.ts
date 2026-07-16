'use server';

import { revalidatePath } from 'next/cache';
import SessionNode from 'supertokens-node/recipe/session';
import TotpNode from 'supertokens-node/recipe/totp';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { collectAccountData } from '@/app/features/users/dataExport';
import { setEmailVerified } from '@/app/features/users/emailVerification';

function auditUser(action: AuditAction, actorId: string, userId: string): Promise<void> {
  return recordAuditEvent({ action, actorId, targetType: 'user', targetId: userId });
}

/**
 * Disables an account: blocks future sign-in (enforced in the EmailPassword
 * signIn override) and revokes every active session so the lockout is immediate.
 * Data is preserved, unlike deletion.
 */
export async function disableUserAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;
  if (userId === actorId) return; // never lock yourself out

  await UserMetadataNode.updateUserMetadata(userId, { disabledAt: Date.now() });
  await SessionNode.revokeAllSessionsForUser(userId);
  await auditUser('user.disable', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

/** Re-enables a previously disabled account so the user can sign in again. */
export async function enableUserAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await UserMetadataNode.updateUserMetadata(userId, { disabledAt: null });
  await auditUser('user.enable', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

/** Admin override: marks every email on the account as verified. */
export async function verifyEmailAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await setEmailVerified(userId, true);
  await auditUser('user.email_verify', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

/** Admin override: clears the verified flag on every email on the account. */
export async function unverifyEmailAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await setEmailVerified(userId, false);
  await auditUser('user.email_unverify', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

export async function revokeSessionAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const sessionHandle = formData.get('sessionHandle');
  const userId = formData.get('userId');
  if (typeof sessionHandle !== 'string' || typeof userId !== 'string') return;

  await SessionNode.revokeSession(sessionHandle);
  await auditUser('user.session_revoke', actorId, userId);
  revalidatePath(`/users/${userId}`);
  revalidatePath('/settings'); // self-revoke from the Settings page
}

export async function revokeAllSessionsAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string') return;

  await SessionNode.revokeAllSessionsForUser(userId);
  await auditUser('user.session_revoke_all', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

/**
 * Recovery path for a super-admin who has lost their authenticator. Because TOTP
 * is mandatory, removing the device alone would still leave the live session
 * "MFA complete"; we also revoke every session so the next sign-in forces a
 * fresh TOTP enrollment via the standard /auth/mfa/totp flow.
 */
export async function resetMfaAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  const { devices } = await TotpNode.listDevices(userId);
  await Promise.all(devices.map((device) => TotpNode.removeDevice(userId, device.name)));

  await SessionNode.revokeAllSessionsForUser(userId);
  await auditUser('user.mfa_reset', actorId, userId);
  revalidatePath(`/users/${userId}`);
}

export async function grantSuperAdminAction(formData: FormData) {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return;

  await UserRolesNode.createNewRoleOrAddPermissions(SUPERADMIN_ROLE, []);
  await UserRolesNode.addRoleToUser(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
  await auditUser('role.grant', actorId, userId);
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
  await auditUser('role.revoke', callerId, userId);
  revalidatePath(`/users/${userId}`);
}

/**
 * Assembles the full GDPR subject-access bundle for one account. Handing a
 * person's complete data to an employee is itself a sensitive act, so the
 * export is audited before the payload is returned.
 */
export async function exportAccountDataAction(formData: FormData): Promise<string | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.length === 0) return null;

  const data = await collectAccountData(userId);
  if (!data) return null;

  await auditUser('user.data_export', actorId, userId);
  return JSON.stringify(data, null, 2);
}
