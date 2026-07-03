'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { isBootstrapAdmin } from '@/app/features/users/bootstrap';

function cleanIds(userIds: unknown): string[] {
  if (!Array.isArray(userIds)) return [];
  return userIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

async function auditEach(action: AuditAction, actorId: string, userId: string, label?: string) {
  await recordAuditEvent({
    action,
    actorId,
    targetType: 'user',
    targetId: userId,
    targetLabel: label,
  });
}

export async function bulkDisableUsersAction(userIds: string[]) {
  const { userId: actorId } = await requireSuperAdmin();
  for (const id of cleanIds(userIds)) {
    if (id === actorId) continue; // never disable yourself in a sweep
    if (await isBootstrapAdmin(id)) continue; // never lock out a break-glass admin
    await UserMetadataNode.updateUserMetadata(id, { disabledAt: Date.now() });
    await SessionNode.revokeAllSessionsForUser(id);
    await auditEach('user.disable', actorId, id);
  }
  revalidatePath('/users');
}

export async function bulkEnableUsersAction(userIds: string[]) {
  const { userId: actorId } = await requireSuperAdmin();
  for (const id of cleanIds(userIds)) {
    await UserMetadataNode.updateUserMetadata(id, { disabledAt: null });
    await auditEach('user.enable', actorId, id);
  }
  revalidatePath('/users');
}

export async function bulkDeleteUsersAction(userIds: string[]) {
  const { userId: actorId } = await requireSuperAdmin();
  for (const id of cleanIds(userIds)) {
    if (id === actorId) continue; // never delete yourself in a sweep
    let label: string | undefined;
    try {
      const user = await SuperTokens.getUser(id);
      label = user?.emails[0];
    } catch {
      /* labelling is best-effort */
    }
    await SuperTokens.deleteUser(id);
    await auditEach('user.delete', actorId, id, label);
  }
  revalidatePath('/users');
}
