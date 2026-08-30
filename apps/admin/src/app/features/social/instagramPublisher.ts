import 'server-only';

import { recordAuditEvent } from '@/app/features/audit/store';
import { logger } from '@/app/lib/logger';

import type { InstagramConfig } from './config';
import {
  createReelFromUrl,
  createResumableReel,
  fetchContainerStatus,
  publishContainer,
  uploadReelBytes,
} from './instagram';
import { getUsableInstagramConnection } from './store';
import type { InstagramConnection, InstagramPostOptions } from './types';

/**
 * How long to wait for Instagram to transcode before handing the caller a
 * container id to finish later. This MUST stay well under the hosting gateway's
 * response timeout (~30s on Amplify): a longer wait returns a 504 to the caller
 * even though the publish then completes server-side, which reads as a failure
 * and risks a duplicate on retry. So we wait only briefly and hand back a 202 +
 * containerId; the caller re-calls (finish mode) to publish the same container.
 */
const MAX_WAIT_MS = 15_000;
const POLL_INTERVAL_MS = 3_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface InstagramPublishRequest {
  // Exactly one video source. graph.instagram.com (Instagram Login) requires
  // video_url for Reels, so the scheduler sends `videoUrl` (a public HTTPS URL).
  // `bytes` stays for the admin composer's resumable path.
  videoUrl?: string;
  bytes?: Uint8Array;
  options: InstagramPostOptions;
}

export type InstagramPublishOutcome =
  | { ok: true; state: 'published'; mediaId: string }
  // Transcoding outran the wait. Nothing is lost: the container is real and the
  // status endpoint finishes it.
  | { ok: true; state: 'processing'; containerId: string }
  | { ok: false; reason: 'not_connected' }
  | { ok: false; reason: 'container_failed'; detail: string };

async function auditPost(actorId: string, connection: InstagramConnection): Promise<void> {
  await recordAuditEvent({
    action: 'social.post',
    actorId,
    targetType: 'social_account',
    targetId: `instagram:${connection.userId}`,
    targetLabel: connection.username ? `Instagram @${connection.username}` : 'Instagram',
  });
}

/** Polls until the container is publishable, the deadline passes, or it errors. */
async function waitForContainer(
  accessToken: string,
  containerId: string,
  deadline: number
): Promise<'FINISHED' | 'IN_PROGRESS' | 'ERROR'> {
  let status = await fetchContainerStatus({ accessToken, containerId });
  while (status.statusCode === 'IN_PROGRESS' && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    status = await fetchContainerStatus({ accessToken, containerId });
  }
  if (status.statusCode === 'FINISHED') return 'FINISHED';
  return status.statusCode === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ERROR';
}

/**
 * The single Instagram publish path, shared by the admin composer and the
 * scheduler so the two cannot drift on validation, audit or upstream handling.
 */
export async function publishReel(
  config: InstagramConfig,
  actor: { actorId: string },
  request: InstagramPublishRequest,
  now = Date.now()
): Promise<InstagramPublishOutcome> {
  const connection = await getUsableInstagramConnection(config);
  if (!connection) return { ok: false, reason: 'not_connected' };

  // Prefer the video_url path - the only one Instagram Login accepts for Reels.
  // Fall back to resumable bytes for the admin composer.
  let containerId: string;
  if (request.videoUrl) {
    containerId = await createReelFromUrl({
      accessToken: connection.accessToken,
      igUserId: connection.userId,
      videoUrl: request.videoUrl,
      caption: request.options.caption,
      shareToFeed: request.options.shareToFeed,
    });
  } else if (request.bytes) {
    const target = await createResumableReel({
      accessToken: connection.accessToken,
      igUserId: connection.userId,
      caption: request.options.caption,
      shareToFeed: request.options.shareToFeed,
    });
    await uploadReelBytes({
      uploadUri: target.uploadUri,
      accessToken: connection.accessToken,
      bytes: request.bytes,
    });
    containerId = target.containerId;
  } else {
    return { ok: false, reason: 'container_failed', detail: 'no video source supplied' };
  }

  const state = await waitForContainer(connection.accessToken, containerId, now + MAX_WAIT_MS);
  if (state === 'ERROR') {
    return { ok: false, reason: 'container_failed', detail: containerId };
  }
  if (state === 'IN_PROGRESS') {
    logger.info('Instagram container still transcoding; handing back for follow-up', {
      containerId,
    });
    return { ok: true, state: 'processing', containerId };
  }

  const mediaId = await publishContainer({
    accessToken: connection.accessToken,
    igUserId: connection.userId,
    containerId,
  });
  await auditPost(actor.actorId, connection);
  return { ok: true, state: 'published', mediaId };
}

/**
 * Finishes a publish whose container was still transcoding when the request
 * returned. Safe to call repeatedly: it publishes only once the container
 * reports FINISHED.
 */
export async function finishReel(
  config: InstagramConfig,
  actor: { actorId: string },
  containerId: string
): Promise<InstagramPublishOutcome> {
  const connection = await getUsableInstagramConnection(config);
  if (!connection) return { ok: false, reason: 'not_connected' };

  const status = await fetchContainerStatus({ accessToken: connection.accessToken, containerId });
  if (status.statusCode === 'IN_PROGRESS') {
    return { ok: true, state: 'processing', containerId };
  }
  if (status.statusCode !== 'FINISHED') {
    return { ok: false, reason: 'container_failed', detail: status.error || status.statusCode };
  }

  const mediaId = await publishContainer({
    accessToken: connection.accessToken,
    igUserId: connection.userId,
    containerId,
  });
  await auditPost(actor.actorId, connection);
  return { ok: true, state: 'published', mediaId };
}
