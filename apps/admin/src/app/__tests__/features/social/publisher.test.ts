jest.mock('server-only', () => ({}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

const getUsableConnectionMock = jest.fn();
jest.mock('@/app/features/social/store', () => ({
  getUsableConnection: (...args: unknown[]) => getUsableConnectionMock(...args),
}));

// Declared inside the factory: jest.mock is hoisted above the imports, so a
// const declared out here is still in its temporal dead zone when it runs.
jest.mock('@/app/features/social/tiktok', () => ({
  fetchCreatorInfo: jest.fn(),
  initDirectPost: jest.fn(),
  initInboxDraft: jest.fn(),
  uploadVideoBytes: jest.fn(),
}));

import type { SocialConfig } from '@/app/features/social/config';
import { publishVideo, type PublishRequest } from '@/app/features/social/publisher';
import * as tiktokModule from '@/app/features/social/tiktok';

const tiktok = tiktokModule as unknown as {
  fetchCreatorInfo: jest.Mock;
  initDirectPost: jest.Mock;
  initInboxDraft: jest.Mock;
  uploadVideoBytes: jest.Mock;
};

const CONFIG = {} as SocialConfig;
const ACTOR = { actorId: 'user-1' };

const CONNECTION = {
  openId: 'oid',
  displayName: 'yosemite_crew',
  accessToken: 'at',
};

function request(overrides: Partial<PublishRequest> = {}): PublishRequest {
  return {
    bytes: new Uint8Array(2048),
    mode: 'direct',
    options: {
      title: 'caption',
      privacy: 'SELF_ONLY',
      disableComment: false,
      disableDuet: false,
      disableStitch: false,
      coverMs: 1000,
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getUsableConnectionMock.mockResolvedValue(CONNECTION);
  tiktok.fetchCreatorInfo.mockResolvedValue({ privacyOptions: ['SELF_ONLY'] });
  tiktok.initDirectPost.mockResolvedValue({ publishId: 'pid', uploadUrl: 'https://up' });
  tiktok.initInboxDraft.mockResolvedValue({ publishId: 'draft', uploadUrl: 'https://up' });
  tiktok.uploadVideoBytes.mockResolvedValue(undefined);
});

describe('publishVideo', () => {
  it('reports not_connected when there is no usable connection', async () => {
    getUsableConnectionMock.mockResolvedValue(null);
    expect(await publishVideo(CONFIG, ACTOR, request())).toEqual({
      ok: false,
      reason: 'not_connected',
    });
    expect(tiktok.uploadVideoBytes).not.toHaveBeenCalled();
  });

  it('checks the account rules before a direct post and uploads the bytes', async () => {
    const result = await publishVideo(CONFIG, ACTOR, request());
    expect(result).toEqual({ ok: true, publishId: 'pid', mode: 'direct' });
    expect(tiktok.fetchCreatorInfo).toHaveBeenCalledWith('at');
    expect(tiktok.initDirectPost).toHaveBeenCalledWith('at', {
      size: 2048,
      options: expect.objectContaining({ privacy: 'SELF_ONLY' }),
    });
    expect(tiktok.uploadVideoBytes).toHaveBeenCalledWith('https://up', expect.any(Uint8Array));
  });

  it('refuses a privacy level the account does not currently allow', async () => {
    tiktok.fetchCreatorInfo.mockResolvedValue({ privacyOptions: ['SELF_ONLY'] });
    const wide = request({
      options: { ...request().options, privacy: 'PUBLIC_TO_EVERYONE' },
    });
    expect(await publishVideo(CONFIG, ACTOR, wide)).toEqual({
      ok: false,
      reason: 'privacy_rejected',
      allowed: ['SELF_ONLY'],
    });
    expect(tiktok.initDirectPost).not.toHaveBeenCalled();
    expect(recordAuditEventMock).not.toHaveBeenCalled();
  });

  it('skips the creator-info check for an inbox draft', async () => {
    const result = await publishVideo(CONFIG, ACTOR, request({ mode: 'draft' }));
    expect(result).toEqual({ ok: true, publishId: 'draft', mode: 'draft' });
    expect(tiktok.fetchCreatorInfo).not.toHaveBeenCalled();
    expect(tiktok.initInboxDraft).toHaveBeenCalledWith('at', { size: 2048 });
  });

  it('records an audit event naming the account and the actor', async () => {
    await publishVideo(CONFIG, { actorId: 'scheduler:social-poster' }, request());
    expect(recordAuditEventMock).toHaveBeenCalledWith({
      action: 'social.post',
      actorId: 'scheduler:social-poster',
      targetType: 'social_account',
      targetId: 'tiktok:oid',
      targetLabel: 'TikTok @yosemite_crew',
    });
  });

  it('falls back to a bare label when the display name is unknown', async () => {
    getUsableConnectionMock.mockResolvedValue({ ...CONNECTION, displayName: '' });
    await publishVideo(CONFIG, ACTOR, request());
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetLabel: 'TikTok' })
    );
  });

  it('propagates an upstream failure rather than swallowing it', async () => {
    tiktok.uploadVideoBytes.mockRejectedValue(new Error('boom'));
    await expect(publishVideo(CONFIG, ACTOR, request())).rejects.toThrow('boom');
  });
});
