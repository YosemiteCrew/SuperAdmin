'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_PAGE_SIZE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import type { AuditAction } from '@/app/features/audit/types';
import { isBootstrapAdmin } from '@/app/features/users/bootstrap';
import { disableAccount } from '@/app/features/users/disable';

/**
 * What a sweep did, so the table can report it. `skipped` is a deliberate
 * refusal (self, a break-glass admin, an account already in the target state);
 * `failed` is an id whose own work threw. They are counted apart because the
 * operator's next move differs: a skip is expected, a failure is a retry.
 */
export interface BulkUserResult {
  done: number;
  skipped: number;
  failed: number;
}

function cleanIds(userIds: unknown): string[] {
  if (!Array.isArray(userIds) || userIds.length > DEFAULT_PAGE_SIZE) return [];
  return Array.from(
    new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
  );
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

type Outcome = 'done' | 'skipped';

/**
 * Runs one id's work inside its own boundary so a single failing account is
 * counted and the rest of the sweep still runs.
 */
async function sweep(
  userIds: string[],
  path: string,
  each: (id: string) => Promise<Outcome>
): Promise<BulkUserResult> {
  const result: BulkUserResult = { done: 0, skipped: 0, failed: 0 };
  for (const id of cleanIds(userIds)) {
    try {
      result[await each(id)] += 1;
    } catch (err) {
      result.failed += 1;
      console.error('[users] bulk action failed for one account', { err });
    }
  }
  revalidatePath(path);
  return result;
}

export async function bulkDisableUsersAction(userIds: string[]): Promise<BulkUserResult> {
  const { userId: actorId } = await requireSuperAdmin();
  return sweep(userIds, '/users', async (id) => {
    if (id === actorId) return 'skipped'; // never disable yourself in a sweep
    if (await isBootstrapAdmin(id)) return 'skipped'; // never lock out a break-glass admin
    if (await disableAccount(id)) await auditEach('user.disable', actorId, id);
    // Revoke even when already disabled: pressing Disable again is the retry for
    // a revocation that failed after the durable disable landed.
    await SessionNode.revokeAllSessionsForUser(id);
    return 'done';
  });
}

export async function bulkEnableUsersAction(userIds: string[]): Promise<BulkUserResult> {
  const { userId: actorId } = await requireSuperAdmin();
  return sweep(userIds, '/users', async (id) => {
    const { metadata } = await UserMetadataNode.getUserMetadata(id);
    if (typeof metadata.disabledAt !== 'number') return 'skipped';
    await UserMetadataNode.updateUserMetadata(id, { disabledAt: null });
    await auditEach('user.enable', actorId, id);
    return 'done';
  });
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<BulkUserResult> {
  const { userId: actorId } = await requireSuperAdmin();
  return sweep(userIds, '/users', async (id) => {
    if (id === actorId) return 'skipped'; // never delete yourself in a sweep
    if (await isBootstrapAdmin(id)) return 'skipped'; // never delete a break-glass admin
    let label: string | undefined;
    let found = true;
    try {
      const user = await SuperTokens.getUser(id);
      found = Boolean(user);
      label = user?.emails[0];
    } catch {
      /* labelling is best-effort */
    }
    if (!found) return 'skipped';
    await SuperTokens.deleteUser(id);
    await auditEach('user.delete', actorId, id, label);
    return 'done';
  });
}
