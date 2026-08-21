/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

const getUsableInstagramConnectionMock = jest.fn();
jest.mock('@/app/features/social/store', () => ({
  getUsableInstagramConnection: (...args: unknown[]) => getUsableInstagramConnectionMock(...args),
}));

jest.mock('@/app/features/social/instagram', () => ({
  createResumableReel: jest.fn(),
  fetchContainerStatus: jest.fn(),
  publishContainer: jest.fn(),
  uploadReelBytes: jest.fn(),
}));

import type { InstagramConfig } from '@/app/features/social/config';
import * as igModule from '@/app/features/social/instagram';
import { finishReel, publishReel } from '@/app/features/social/instagramPublisher';

const ig = igModule as unknown as {
  createResumableReel: jest.Mock;
  fetchContainerStatus: jest.Mock;
  publishContainer: jest.Mock;
  uploadReelBytes: jest.Mock;
};

const CONFIG = {} as InstagramConfig;
const ACTOR = { actorId: 'user-1' };
const CONNECTION = { userId: '178414', username: 'yosemite_crew', accessToken: 'tok' };
const NOW = 1_700_000_000_000;

const request = {
  bytes: new Uint8Array(2048),
  options: { caption: 'vet humour', shareToFeed: true },
};

beforeEach(() => {
  jest.clearAllMocks();
  getUsableInstagramConnectionMock.mockResolvedValue(CONNECTION);
  ig.createResumableReel.mockResolvedValue({ containerId: 'c1', uploadUri: 'https://rupload' });
  ig.uploadReelBytes.mockResolvedValue(undefined);
  ig.fetchContainerStatus.mockResolvedValue({ statusCode: 'FINISHED', error: '' });
  ig.publishContainer.mockResolvedValue('media-9');
});

describe('publishReel', () => {
  it('reports not_connected when there is no usable connection', async () => {
    getUsableInstagramConnectionMock.mockResolvedValue(null);
    expect(await publishReel(CONFIG, ACTOR, request, NOW)).toEqual({
      ok: false,
      reason: 'not_connected',
    });
    expect(ig.createResumableReel).not.toHaveBeenCalled();
  });

  it('creates the container, uploads, publishes and audits', async () => {
    const result = await publishReel(CONFIG, ACTOR, request, NOW);
    expect(result).toEqual({ ok: true, state: 'published', mediaId: 'media-9' });
    expect(ig.createResumableReel).toHaveBeenCalledWith({
      accessToken: 'tok',
      igUserId: '178414',
      caption: 'vet humour',
      shareToFeed: true,
    });
    expect(ig.uploadReelBytes).toHaveBeenCalledWith(
      expect.objectContaining({ uploadUri: 'https://rupload' })
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith({
      action: 'social.post',
      actorId: 'user-1',
      targetType: 'social_account',
      targetId: 'instagram:178414',
      targetLabel: 'Instagram @yosemite_crew',
    });
  });

  it('hands back the container id when transcoding outruns the wait', async () => {
    ig.fetchContainerStatus.mockResolvedValue({ statusCode: 'IN_PROGRESS', error: '' });
    // A deadline already in the past means the loop checks once and gives up.
    const result = await publishReel(CONFIG, ACTOR, request, NOW - 10_000_000_000);
    expect(result).toEqual({ ok: true, state: 'processing', containerId: 'c1' });
    // Nothing was published, so nothing is audited yet.
    expect(ig.publishContainer).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('polls until the container finishes, then publishes', async () => {
    jest.useFakeTimers({ now: NOW });
    ig.fetchContainerStatus
      .mockResolvedValueOnce({ statusCode: 'IN_PROGRESS', error: '' })
      .mockResolvedValue({ statusCode: 'FINISHED', error: '' });

    const pending = publishReel(CONFIG, ACTOR, request, NOW);
    // Let the 3s poll interval elapse on the fake clock.
    await jest.advanceTimersByTimeAsync(3_000);
    const result = await pending;

    expect(result).toEqual({ ok: true, state: 'published', mediaId: 'media-9' });
    expect(ig.fetchContainerStatus).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('reports a failed container without publishing', async () => {
    ig.fetchContainerStatus.mockResolvedValue({ statusCode: 'ERROR', error: 'bad aspect ratio' });
    const result = await publishReel(CONFIG, ACTOR, request, NOW);
    expect(result).toMatchObject({ ok: false, reason: 'container_failed' });
    expect(ig.publishContainer).not.toHaveBeenCalled();
  });

  it('falls back to a bare label when the handle is unknown', async () => {
    getUsableInstagramConnectionMock.mockResolvedValue({ ...CONNECTION, username: '' });
    await publishReel(CONFIG, ACTOR, request, NOW);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetLabel: 'Instagram' })
    );
  });

  it('propagates an upstream failure rather than swallowing it', async () => {
    ig.uploadReelBytes.mockRejectedValue(new Error('boom'));
    await expect(publishReel(CONFIG, ACTOR, request, NOW)).rejects.toThrow('boom');
  });
});

describe('finishReel', () => {
  it('publishes a container that has finished transcoding', async () => {
    const result = await finishReel(CONFIG, ACTOR, 'c1');
    expect(result).toEqual({ ok: true, state: 'published', mediaId: 'media-9' });
    expect(recordAuditEventMock).toHaveBeenCalled();
  });

  it('reports still-processing without publishing, so it is safe to retry', async () => {
    ig.fetchContainerStatus.mockResolvedValue({ statusCode: 'IN_PROGRESS', error: '' });
    expect(await finishReel(CONFIG, ACTOR, 'c1')).toEqual({
      ok: true,
      state: 'processing',
      containerId: 'c1',
    });
    expect(ig.publishContainer).not.toHaveBeenCalled();
  });

  it('reports a failed container with its reason', async () => {
    ig.fetchContainerStatus.mockResolvedValue({ statusCode: 'ERROR', error: 'too short' });
    expect(await finishReel(CONFIG, ACTOR, 'c1')).toEqual({
      ok: false,
      reason: 'container_failed',
      detail: 'too short',
    });
  });

  it('reports not_connected', async () => {
    getUsableInstagramConnectionMock.mockResolvedValue(null);
    expect(await finishReel(CONFIG, ACTOR, 'c1')).toEqual({ ok: false, reason: 'not_connected' });
  });
});
