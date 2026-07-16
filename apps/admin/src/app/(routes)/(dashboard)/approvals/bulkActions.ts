'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { MAX_BULK } from '@/app/features/approvals/constants';
import { approveAccount, getApprovalState, rejectAccount } from '@/app/features/approvals/store';
import { recordAuditEvent } from '@/app/features/audit/store';
import { notifyBulkDecision } from '@/app/features/crm/discord/dispatcher';
import { sendTransactional } from '@/app/features/crm/plunk';
import { isBootstrapAdmin } from '@/app/features/users/bootstrap';

export interface BulkApprovalResult {
  processed?: number;
  skipped?: number;
  failed?: number;
  emailsSent?: number;
  error?: string;
}

const WELCOME_SUBJECT = 'Welcome to Yosemite Crew';
const WELCOME_BODY =
  'Your Yosemite Crew account has been approved. You can now sign in and start using the platform.';

function cleanIds(userIds: unknown): string[] {
  if (!Array.isArray(userIds)) return [];
  return Array.from(
    new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))
  );
}

/** Shared entry gate: dedupe the selection and hold it to the batch cap. */
function validateSelection(userIds: unknown): { ids: string[] } | { error: string } {
  const ids = cleanIds(userIds);
  if (ids.length === 0) return { error: 'No accounts selected.' };
  if (ids.length > MAX_BULK) return { error: `Select at most ${MAX_BULK} accounts per batch.` };
  return { ids };
}

/**
 * Shared tail: one Discord summary per batch, never per account, and only when
 * the sweep actually did something. Failing to announce must not fail the sweep
 * that already happened.
 */
async function announceDecision(
  decision: 'approved' | 'rejected',
  processed: number,
  actorId: string
): Promise<void> {
  if (processed === 0) return;
  const actorEmail = await resolveActorEmail(actorId);
  await notifyBulkDecision({ decision, count: processed, actorEmail }).catch((err) => {
    console.error('[approvals] bulk discord notify failed', { err });
  });
}

async function resolveActorEmail(actorId: string): Promise<string> {
  try {
    const actor = await SuperTokens.getUser(actorId);
    return actor?.emails[0] ?? actorId;
  } catch {
    return actorId;
  }
}

/**
 * Only accounts still pending at execution time are acted on — every id is
 * re-checked against the store, so a stale selection can never overturn a
 * decision another admin made after the page rendered.
 */
async function isStillPending(userId: string): Promise<boolean> {
  try {
    return (await getApprovalState(userId)).status === 'pending';
  } catch {
    // Fail closed: unknown state is never acted on in a sweep.
    return false;
  }
}

/** Freshness + existence gate; null means skip this id in the sweep. */
async function resolvePendingTarget(userId: string): Promise<string | null> {
  if (!(await isStillPending(userId))) return null;
  const target = await SuperTokens.getUser(userId).catch(() => undefined);
  if (!target) return null;
  return target.emails[0] ?? userId;
}

export async function bulkApproveAccountsAction(userIds: string[]): Promise<BulkApprovalResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const selection = validateSelection(userIds);
  if ('error' in selection) return { error: selection.error };

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let emailsSent = 0;

  for (const userId of selection.ids) {
    const targetEmail = await resolvePendingTarget(userId);
    if (!targetEmail) {
      skipped++;
      continue;
    }

    // One failing account must never abort the sweep: the rest of the batch
    // still runs, and the summary/revalidation tail below always executes.
    let stillDisabled: boolean;
    try {
      ({ stillDisabled } = await approveAccount({ userId, actorId }));
    } catch (err) {
      console.error('[approvals] bulk approve failed', { userId, err });
      failed++;
      continue;
    }
    await recordAuditEvent({
      action: 'user.approve',
      actorId,
      targetType: 'user',
      targetId: userId,
      targetLabel: targetEmail,
    });
    processed++;

    if (targetEmail.includes('@') && !stillDisabled) {
      try {
        await sendTransactional({ to: targetEmail, subject: WELCOME_SUBJECT, body: WELCOME_BODY });
        emailsSent++;
      } catch (err) {
        console.error('[approvals] bulk welcome email failed', { userId, err });
      }
    }
  }

  await announceDecision('approved', processed, actorId);

  revalidatePath('/approvals');
  return { processed, skipped, failed, emailsSent };
}

export async function bulkRejectAccountsAction(userIds: string[]): Promise<BulkApprovalResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const selection = validateSelection(userIds);
  if ('error' in selection) return { error: selection.error };

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of selection.ids) {
    // Never reject yourself or a break-glass admin in a sweep — rejection
    // disables sign-in, which for a bootstrap account is a lockout.
    if (userId === actorId || (await isBootstrapAdmin(userId))) {
      skipped++;
      continue;
    }

    const targetEmail = await resolvePendingTarget(userId);
    if (!targetEmail) {
      skipped++;
      continue;
    }

    try {
      await rejectAccount({ userId, actorId });
    } catch (err) {
      console.error('[approvals] bulk reject failed', { userId, err });
      failed++;
      continue;
    }
    await recordAuditEvent({
      action: 'user.reject',
      actorId,
      targetType: 'user',
      targetId: userId,
      targetLabel: targetEmail,
    });
    processed++;

    try {
      await SessionNode.revokeAllSessionsForUser(userId);
    } catch (err) {
      console.error('[approvals] bulk session revocation failed', { userId, err });
    }
  }

  await announceDecision('rejected', processed, actorId);

  revalidatePath('/approvals');
  return { processed, skipped, failed };
}
