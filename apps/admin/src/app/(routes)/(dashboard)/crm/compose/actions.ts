'use server';

import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { notifyCampaignSent } from '@/app/features/crm/discord/dispatcher';
import { broadcastCampaign } from '@/app/features/crm/plunk';
import { recordCampaign, type CampaignAudience } from '@/app/features/crm/campaigns/store';
import { logger } from '@/app/lib/logger';

export interface SendCampaignResult {
  sent?: number;
  failed?: number;
  error?: string;
}

const VALID_AUDIENCES = new Set<CampaignAudience>(['all', 'admins']);

/**
 * Emails of the accounts actually holding the super-admin role.
 *
 * Resolved from the role directory, never from a user listing: the audience is a
 * promise to the operator that "Super-admins only" reaches nobody else, so it
 * must be derived from the same source that grants the privilege. Throws rather
 * than degrading if the role lookup is not OK - the caller turns that into a
 * visible error, so an unresolvable admin list cancels the send instead of
 * quietly broadcasting to a wider or empty audience.
 */
async function fetchAdminEmails(): Promise<string[]> {
  const roleHolders = await UserRolesNode.getUsersThatHaveRole(DEFAULT_TENANT_ID, SUPERADMIN_ROLE);
  if (roleHolders.status !== 'OK') {
    throw new Error('Could not resolve the super-admin role holders.');
  }

  const emails = await Promise.all(
    roleHolders.users.map(async (id) => {
      const user = await SuperTokens.getUser(id);
      return user?.emails[0];
    })
  );
  return emails.filter((email): email is string => Boolean(email));
}

async function fetchRecipientEmails(audience: CampaignAudience): Promise<string[]> {
  if (audience === 'admins') {
    return fetchAdminEmails();
  }

  const emails: string[] = [];
  let paginationToken: string | undefined;

  do {
    const page = await SuperTokens.getUsersOldestFirst({
      tenantId: DEFAULT_TENANT_ID,
      limit: 500,
      paginationToken,
    });
    for (const u of page.users) {
      if (u.emails[0]) emails.push(u.emails[0]);
    }
    paginationToken = page.nextPaginationToken;
  } while (paginationToken);

  return emails;
}

export async function sendCampaignAction(formData: FormData): Promise<SendCampaignResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const subject = formData.get('subject');
  const body = formData.get('body');
  const audienceRaw = formData.get('audience');

  if (typeof subject !== 'string' || subject.trim().length < 3) {
    return { error: 'Subject must be at least 3 characters.' };
  }
  if (typeof body !== 'string' || body.trim().length < 10) {
    return { error: 'Body must be at least 10 characters.' };
  }
  if (typeof audienceRaw !== 'string' || !VALID_AUDIENCES.has(audienceRaw as CampaignAudience)) {
    return { error: 'Invalid audience selection.' };
  }

  const audience = audienceRaw as CampaignAudience;

  const actor = await SuperTokens.getUser(actorId);
  const actorEmail = actor?.emails[0] ?? actorId;

  let emails: string[];
  try {
    emails = await fetchRecipientEmails(audience);
  } catch {
    return { error: 'Failed to fetch recipient list.' };
  }

  if (emails.length === 0) return { error: 'No recipients found for the selected audience.' };

  const { sent, failed } = await broadcastCampaign({
    emails,
    subject: subject.trim(),
    body: body.trim(),
  });

  await recordCampaign({
    subject: subject.trim(),
    preview: body.trim().slice(0, 120),
    audience,
    sentCount: sent,
    failedCount: failed,
    sentAt: Date.now(),
    sentBy: actorId,
    sentByEmail: actorEmail,
  });

  // The campaign has already gone out by this point, so a failed Discord notice
  // must not fail the action - but it must not vanish either, or the channel
  // silently stops reflecting sends. Swallow it for the caller, surface it for
  // the log pipeline.
  await notifyCampaignSent({
    subject: subject.trim(),
    sentCount: sent,
    sentByEmail: actorEmail,
  }).catch((error: unknown) => {
    logger.error('Campaign sent but the Discord notification failed', {
      subject: subject.trim(),
      sentCount: sent,
      actorId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return { sent, failed };
}
