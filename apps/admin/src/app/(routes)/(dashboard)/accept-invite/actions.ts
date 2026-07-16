'use server';

import { redirect } from 'next/navigation';
import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { ensureSuperTokensInit, getAuthenticatedSession } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getInviteByToken, markInviteUsed } from '@/app/features/invites/store';
import { inviteStatus, type InviteStatus } from '@/app/features/invites/types';

export interface AcceptInviteResult {
  error?: string;
}

/**
 * Why a non-pending invite cannot be accepted. Keyed by status rather than
 * nested ternaries, so adding an InviteStatus fails to compile until it has a
 * message rather than silently falling through to the wrong one.
 */
const NOT_PENDING_MESSAGE: Record<Exclude<InviteStatus, 'pending'>, string> = {
  expired: 'This invite link has expired. Ask a super-admin to generate a new one.',
  revoked: 'This invite has been revoked.',
  used: 'This invite has already been used.',
};

export async function acceptInviteAction(formData: FormData): Promise<AcceptInviteResult> {
  ensureSuperTokensInit();

  const token = formData.get('token');
  if (typeof token !== 'string' || token.trim().length === 0) {
    return { error: 'Invalid invite token.' };
  }

  const invite = await getInviteByToken(token);
  if (!invite) return { error: 'Invite not found or already used.' };

  const status = inviteStatus(invite);
  if (status !== 'pending') {
    return { error: NOT_PENDING_MESSAGE[status] };
  }

  // The invitee is not yet a super-admin; getAuthenticatedSession checks only that
  // they have a valid session (no role check), redirecting to /auth if absent.
  const { userId } = await getAuthenticatedSession();
  const user = await SuperTokens.getUser(userId);
  const userEmail = user?.emails[0] ?? userId;

  await UserRolesNode.addRoleToUser(DEFAULT_TENANT_ID, userId, SUPERADMIN_ROLE);
  await markInviteUsed({ token, usedBy: userId, usedByEmail: userEmail });
  // The actor is whoever accepted and thereby gained super-admin, not the
  // inviter: this is the event that records a privilege escalation, so it has to
  // show up in the new admin's own activity and name them as the one who acted.
  // The inviter is not lost - targetId resolves to the invite, which carries
  // createdBy.
  await recordAuditEvent({
    action: 'invite.use',
    actorId: userId,
    targetType: 'invite',
    targetId: invite.id,
    targetLabel: userEmail,
  });

  redirect('/dashboard');
}
