'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';

import { requireSuperAdmin } from '@/app/config/backend';
import { publicEnv } from '@/app/config/env.public';
import { recordAuditEvent } from '@/app/features/audit/store';
import { createInvite, revokeInvite } from '@/app/features/invites/store';

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@');
  if (at < 1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

export interface CreateInviteResult {
  inviteUrl?: string;
  error?: string;
}

export async function createInviteAction(formData: FormData): Promise<CreateInviteResult> {
  const { userId: actorId } = await requireSuperAdmin();

  const email = formData.get('email');
  if (typeof email !== 'string' || !looksLikeEmail(email.trim())) {
    return { error: 'A valid email address is required.' };
  }

  const user = await SuperTokens.getUser(actorId);
  const actorEmail = user?.emails[0] ?? actorId;

  const invite = await createInvite({
    email: email.trim().toLowerCase(),
    createdBy: actorId,
    createdByEmail: actorEmail,
  });

  await recordAuditEvent({
    action: 'invite.create',
    actorId,
    targetType: 'invite',
    targetId: invite.id,
    targetLabel: invite.email,
  });

  revalidatePath('/invites');
  const inviteUrl = `${publicEnv.appOrigin}/accept-invite?token=${invite.token}`;
  return { inviteUrl };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const { userId: actorId } = await requireSuperAdmin();

  const inviteId = formData.get('inviteId');
  if (typeof inviteId !== 'string' || inviteId.trim().length === 0) return;

  await revokeInvite({ inviteId, revokedBy: actorId });
  await recordAuditEvent({
    action: 'invite.revoke',
    actorId,
    targetType: 'invite',
    targetId: inviteId,
  });
  revalidatePath('/invites');
}
