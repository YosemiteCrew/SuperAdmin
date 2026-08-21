import 'server-only';

import { recordAuditEvent } from '@/app/features/audit/store';

import type { SocialConfig } from './config';
import type { PostMode } from './limits';
import { getUsableConnection } from './store';
import { fetchCreatorInfo, initDirectPost, initInboxDraft, uploadVideoBytes } from './tiktok';
import type { TikTokConnection, TikTokPostOptions } from './types';

export interface PublishRequest {
  bytes: Uint8Array;
  mode: PostMode;
  options: TikTokPostOptions;
}

export type PublishOutcome =
  | { ok: true; publishId: string; mode: PostMode }
  | { ok: false; reason: 'not_connected' }
  | { ok: false; reason: 'privacy_rejected'; allowed: string[] };

/**
 * Opens the publish, honouring the account's *current* privacy options. TikTok
 * requires creator_info to be queried immediately before a direct post, and an
 * unaudited app is capped at SELF_ONLY — sending anything wider is refused
 * upstream, so the mismatch is detected here and reported precisely.
 */
async function openPublish(
  connection: TikTokConnection,
  request: PublishRequest
): Promise<{ publishId: string; uploadUrl: string } | { allowed: string[] }> {
  const size = request.bytes.byteLength;
  if (request.mode === 'draft') {
    return initInboxDraft(connection.accessToken, { size });
  }

  const creator = await fetchCreatorInfo(connection.accessToken);
  if (!creator.privacyOptions.includes(request.options.privacy)) {
    return { allowed: creator.privacyOptions };
  }
  return initDirectPost(connection.accessToken, { size, options: request.options });
}

/**
 * The single publish path, shared by the admin composer and the scheduler so the
 * two can never drift on validation, audit or upstream handling. `actorId` is a
 * real user id for a human post and a stable pseudo-id for a scheduled one.
 */
export async function publishVideo(
  config: SocialConfig,
  actor: { actorId: string },
  request: PublishRequest
): Promise<PublishOutcome> {
  const connection = await getUsableConnection(config);
  if (!connection) return { ok: false, reason: 'not_connected' };

  const opened = await openPublish(connection, request);
  if ('allowed' in opened) {
    return { ok: false, reason: 'privacy_rejected', allowed: opened.allowed };
  }

  await uploadVideoBytes(opened.uploadUrl, request.bytes);
  await recordAuditEvent({
    action: 'social.post',
    actorId: actor.actorId,
    targetType: 'social_account',
    targetId: `tiktok:${connection.openId}`,
    targetLabel: connection.displayName ? `TikTok @${connection.displayName}` : 'TikTok',
  });

  return { ok: true, publishId: opened.publishId, mode: request.mode };
}
