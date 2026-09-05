'use server';

import { redirect } from 'next/navigation';
import SuperTokens from 'supertokens-node';
import TotpNode from 'supertokens-node/recipe/totp';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import {
  ensureSuperTokensInit,
  getAuthenticatedSession,
  isDisabledOrUnknown,
} from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import { logger } from '@/app/lib/logger';
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

  // Authenticate before looking up the token so direct server-action requests
  // cannot use response differences to probe invitation state.
  const returnTo = `/accept-invite?token=${encodeURIComponent(token)}`;
  const { userId, mfaComplete } = await getAuthenticatedSession(returnTo);

  const invite = await getInviteByToken(token);
  if (!invite) return { error: 'Invite not found or already used.' };

  const status = inviteStatus(invite);
  if (status !== 'pending') {
    return { error: NOT_PENDING_MESSAGE[status] };
  }

  // The invitee is not yet a super-admin; getAuthenticatedSession checks only that
  // they have a valid session (no role check), redirecting to /auth if absent.
  const user = await SuperTokens.getUser(userId);
  const userEmail = user?.emails[0];

  if (!userEmail || userEmail.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    return { error: 'Sign in with the email address this invitation was sent to.' };
  }

  // This is the only path in the panel that GRANTS super-admin, so it applies at
  // least the checks the paths that merely consume the role already apply.
  // requireSuperAdmin() checks the disabled flag and the second factor; before
  // this, accepting an invite checked neither.
  //
  // Fail closed, unlike the page gate. Disabling an account rests on the sign-in
  // block plus session revocation, and revocation for a session that outlived
  // the disable is triggered lazily by requireSuperAdmin - which this path never
  // reaches. Without this, a disabled account holding a live session could
  // accept a pending invite and be granted the role, defeating the disable
  // through the one action it most needs to stop.
  if (await isDisabledOrUnknown(userId)) {
    return { error: 'This account cannot accept invitations. Contact a super-admin.' };
  }

  // The second factor is required only when the account HAS one. Requiring it
  // unconditionally would deadlock a genuinely new admin with nothing enrolled;
  // not requiring it at all would let a first-factor-only session take the role
  // and then enrol its own TOTP device afterwards, finishing as a full
  // super-admin having never passed a factor that already existed. Keying on
  // whether a verified device exists is what separates those two cases.
  if (!mfaComplete && (await hasEnrolledSecondFactor(userId))) {
    return { error: 'Complete your second factor before accepting this invitation.' };
  }

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

/**
 * Whether the account already has a verified TOTP device.
 *
 * Fails CLOSED - an unreadable device list is treated as "has one", so the
 * second factor is demanded rather than skipped. Being wrong that way costs an
 * invitee another sign-in; being wrong the other way grants the highest
 * privilege in the estate on one factor.
 */
async function hasEnrolledSecondFactor(userId: string): Promise<boolean> {
  try {
    const { devices } = await TotpNode.listDevices(userId);
    return devices.some((device) => device.verified);
  } catch (error) {
    // Reported rather than discarded: this returning true blocks an invitee who
    // may have no device at all, so the failure has to be visible somewhere.
    logger.error('Could not read TOTP devices; demanding the second factor', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}
