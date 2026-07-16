'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { approveAccount, getApprovalState, rejectAccount } from '@/app/features/approvals/store';
import { recordAuditEvent } from '@/app/features/audit/store';
import { notifyAccountDecision } from '@/app/features/crm/discord/dispatcher';
import { sendTransactional } from '@/app/features/crm/plunk';

export interface ApprovalActionResult {
  error?: string;
  warning?: string;
  emailSent?: boolean;
}

const WELCOME_SUBJECT = 'Welcome to Yosemite Crew';
const WELCOME_BODY =
  'Your Yosemite Crew account has been approved. You can now sign in and start using the platform.';

const STALE_STATE_ERROR =
  'This account changed state since the page loaded. Refresh and review again.';

/** Best-effort display name for Discord; must never fail the decision path. */
async function resolveActorEmail(actorId: string): Promise<string> {
  try {
    const actor = await SuperTokens.getUser(actorId);
    return actor?.emails[0] ?? actorId;
  } catch {
    return actorId;
  }
}

interface ValidatedTarget {
  userId: string;
  targetEmail: string;
  error?: never;
}

async function validateTarget(formData: FormData): Promise<ValidatedTarget | { error: string }> {
  const userId = formData.get('userId');
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { error: 'Invalid account id.' };
  }

  const target = await SuperTokens.getUser(userId);
  if (!target) return { error: 'Account not found.' };

  // Compare-and-set guard: the decision only applies if the account is still
  // in the state the admin was looking at when they clicked.
  const expected = formData.get('expectedStatus');
  const current = await getApprovalState(userId);
  if (typeof expected !== 'string' || expected !== current.status) {
    return { error: STALE_STATE_ERROR };
  }

  return { userId, targetEmail: target.emails[0] ?? userId };
}

export async function approveAccountAction(formData: FormData): Promise<ApprovalActionResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const validated = await validateTarget(formData);
  if ('error' in validated) return { error: validated.error };
  const { userId, targetEmail } = validated;

  // Order matters: state change → audit → side effects. The audit write is
  // internally fail-open (it logs, never throws), so nothing separates the
  // applied decision from its audit record.
  const { stillDisabled } = await approveAccount({ userId, actorId });
  await recordAuditEvent({
    action: 'user.approve',
    actorId,
    targetType: 'user',
    targetId: userId,
    targetLabel: targetEmail,
  });

  // CRM side effects are best-effort: an unreachable Plunk instance or Discord
  // webhook must never roll back or block the approval itself.
  let emailSent = false;
  if (targetEmail.includes('@') && !stillDisabled) {
    try {
      await sendTransactional({ to: targetEmail, subject: WELCOME_SUBJECT, body: WELCOME_BODY });
      emailSent = true;
    } catch (err) {
      console.error('[approvals] welcome email failed', { userId, err });
    }
  }

  const actorEmail = await resolveActorEmail(actorId);
  await notifyAccountDecision({
    decision: 'approved',
    accountEmail: targetEmail,
    actorEmail,
  }).catch((err) => {
    console.error('[approvals] discord notify failed', { userId, err });
  });

  revalidatePath('/approvals');
  return {
    emailSent,
    warning: stillDisabled
      ? 'Approved, but the account is still disabled from a separate admin action. No welcome email was sent.'
      : undefined,
  };
}

export async function rejectAccountAction(formData: FormData): Promise<ApprovalActionResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const preCheck = formData.get('userId');
  if (typeof preCheck === 'string' && preCheck === actorId) {
    return { error: 'You cannot reject your own account.' };
  }

  const validated = await validateTarget(formData);
  if ('error' in validated) return { error: validated.error };
  const { userId, targetEmail } = validated;

  await rejectAccount({ userId, actorId });
  await recordAuditEvent({
    action: 'user.reject',
    actorId,
    targetType: 'user',
    targetId: userId,
    targetLabel: targetEmail,
  });

  // Sign-in is already blocked by the metadata write above (fail closed).
  // Revoking live sessions runs after the audit record so a revocation failure
  // can never erase the trail; it is surfaced to the admin for a retry.
  let warning: string | undefined;
  try {
    await SessionNode.revokeAllSessionsForUser(userId);
  } catch (err) {
    console.error('[approvals] session revocation failed', { userId, err });
    warning =
      'Rejected and sign-in blocked, but revoking live sessions failed. Use the user page to revoke sessions.';
  }

  const actorEmail = await resolveActorEmail(actorId);
  await notifyAccountDecision({
    decision: 'rejected',
    accountEmail: targetEmail,
    actorEmail,
  }).catch((err) => {
    console.error('[approvals] discord notify failed', { userId, err });
  });

  revalidatePath('/approvals');
  return { warning };
}
