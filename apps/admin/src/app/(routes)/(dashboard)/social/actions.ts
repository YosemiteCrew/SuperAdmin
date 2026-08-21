'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getInstagramConfig, getTikTokConfig } from '@/app/features/social/config';
import {
  clearConnection,
  clearInstagramConnection,
  readConnection,
  readInstagramConnection,
} from '@/app/features/social/store';

export interface DisconnectResult {
  ok: boolean;
  message: string;
}

/**
 * Forgets the stored TikTok credentials. TikTok has no token-revocation endpoint
 * on this app's scopes, so this drops our copy — the grant itself is withdrawn by
 * the account owner in TikTok's own settings.
 */
export async function disconnectTikTokAction(): Promise<DisconnectResult> {
  const { userId } = await requireSuperAdmin();
  const config = getTikTokConfig();
  if (!config) {
    return { ok: false, message: 'TikTok posting is not configured on this host.' };
  }

  // Read before clearing so the audit entry can name what was disconnected.
  const existing = await readConnection(config);
  await clearConnection();
  await recordAuditEvent({
    action: 'social.disconnect',
    actorId: userId,
    targetType: 'social_account',
    targetId: existing ? `tiktok:${existing.openId}` : 'tiktok',
    targetLabel: existing?.displayName ? `TikTok @${existing.displayName}` : 'TikTok',
  });

  revalidatePath('/social');
  return { ok: true, message: 'TikTok has been disconnected.' };
}

/**
 * Forgets the stored Instagram credentials. As with TikTok this drops our copy;
 * the grant itself is withdrawn by the account owner in Instagram's own settings.
 */
export async function disconnectInstagramAction(): Promise<DisconnectResult> {
  const { userId } = await requireSuperAdmin();
  const config = getInstagramConfig();
  if (!config) {
    return { ok: false, message: 'Instagram posting is not configured on this host.' };
  }

  const existing = await readInstagramConnection(config);
  await clearInstagramConnection();
  await recordAuditEvent({
    action: 'social.disconnect',
    actorId: userId,
    targetType: 'social_account',
    targetId: existing ? `instagram:${existing.userId}` : 'instagram',
    targetLabel: existing?.username ? `Instagram @${existing.username}` : 'Instagram',
  });

  revalidatePath('/social');
  return { ok: true, message: 'Instagram has been disconnected.' };
}
