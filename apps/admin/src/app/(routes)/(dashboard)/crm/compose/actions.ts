'use server';

import SuperTokens from 'supertokens-node';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { notifyCampaignSent } from '@/app/features/crm/discord/dispatcher';
import { broadcastCampaign } from '@/app/features/crm/plunk';
import { fetchRecipientEmails } from '@/app/features/crm/recipients';
import { recordCampaign, type CampaignAudience } from '@/app/features/crm/campaigns/store';

export interface SendCampaignResult {
  sent?: number;
  failed?: number;
  error?: string;
}

const VALID_AUDIENCES = new Set<CampaignAudience>(['all', 'admins']);

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

  await notifyCampaignSent({
    subject: subject.trim(),
    sentCount: sent,
    sentByEmail: actorEmail,
  }).catch(() => undefined);

  return { sent, failed };
}
