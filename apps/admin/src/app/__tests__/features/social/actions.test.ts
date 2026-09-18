/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/app/config/backend', () => ({ requireSuperAdmin: jest.fn() }));
jest.mock('@/app/features/audit/store', () => ({ recordAuditEvent: jest.fn() }));
jest.mock('@/app/features/social/config', () => ({
  getTikTokConfig: jest.fn(),
  getInstagramConfig: jest.fn(),
}));
jest.mock('@/app/features/social/store', () => ({
  clearConnection: jest.fn(),
  readConnection: jest.fn(),
  clearInstagramConnection: jest.fn(),
  readInstagramConnection: jest.fn(),
}));

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
import {
  disconnectInstagramAction,
  disconnectTikTokAction,
} from '@/app/(routes)/(dashboard)/social/actions';

const requireSuperAdminMock = requireSuperAdmin as jest.Mock;
const getTikTokConfigMock = getTikTokConfig as jest.Mock;
const readConnectionMock = readConnection as jest.Mock;
const clearConnectionMock = clearConnection as jest.Mock;
const recordAuditEventMock = recordAuditEvent as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'user-1' });
  getTikTokConfigMock.mockReturnValue({ clientKey: 'ck' });
  readConnectionMock.mockResolvedValue({ openId: 'oid', displayName: 'yosemite_crew' });
  clearConnectionMock.mockResolvedValue(true);
});

describe('disconnectTikTokAction', () => {
  it('requires a super admin before touching anything', async () => {
    requireSuperAdminMock.mockRejectedValue(new Error('redirect'));
    await expect(disconnectTikTokAction()).rejects.toThrow('redirect');
    expect(clearConnectionMock).not.toHaveBeenCalled();
  });

  it('clears the connection and records who did it', async () => {
    const result = await disconnectTikTokAction();
    expect(result).toEqual({ ok: true, message: 'TikTok has been disconnected.' });
    expect(clearConnectionMock).toHaveBeenCalled();
    expect(recordAuditEventMock).toHaveBeenCalledWith({
      action: 'social.disconnect',
      actorId: 'user-1',
      targetType: 'social_account',
      targetId: 'tiktok:oid',
      targetLabel: 'TikTok @yosemite_crew',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/social');
  });

  it('still audits when unreadable stored material was cleared', async () => {
    readConnectionMock.mockResolvedValue(null);
    await disconnectTikTokAction();
    expect(clearConnectionMock).toHaveBeenCalled();
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'tiktok', targetLabel: 'TikTok' })
    );
  });

  it('does not audit when no connection material was stored', async () => {
    readConnectionMock.mockResolvedValue(null);
    clearConnectionMock.mockResolvedValue(false);

    await expect(disconnectTikTokAction()).resolves.toEqual({
      ok: false,
      message: 'TikTok is not connected.',
    });
    expect(recordAuditEventMock).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/social');
  });

  it('reports an unconfigured host without clearing anything', async () => {
    getTikTokConfigMock.mockReturnValue(null);
    const result = await disconnectTikTokAction();
    expect(result.ok).toBe(false);
    expect(clearConnectionMock).not.toHaveBeenCalled();
  });
});

const getInstagramConfigMock = getInstagramConfig as jest.Mock;
const readInstagramConnectionMock = readInstagramConnection as jest.Mock;
const clearInstagramConnectionMock = clearInstagramConnection as jest.Mock;

describe('disconnectInstagramAction', () => {
  beforeEach(() => {
    getInstagramConfigMock.mockReturnValue({ appId: 'ig' });
    readInstagramConnectionMock.mockResolvedValue({
      userId: '178414',
      username: 'yosemite_crew',
    });
    clearInstagramConnectionMock.mockResolvedValue(true);
  });

  it('requires a super admin before touching anything', async () => {
    requireSuperAdminMock.mockRejectedValue(new Error('redirect'));
    await expect(disconnectInstagramAction()).rejects.toThrow('redirect');
    expect(clearInstagramConnectionMock).not.toHaveBeenCalled();
  });

  it('clears the connection and records who did it', async () => {
    const result = await disconnectInstagramAction();
    expect(result).toEqual({ ok: true, message: 'Instagram has been disconnected.' });
    expect(clearInstagramConnectionMock).toHaveBeenCalled();
    expect(recordAuditEventMock).toHaveBeenCalledWith({
      action: 'social.disconnect',
      actorId: 'user-1',
      targetType: 'social_account',
      targetId: 'instagram:178414',
      targetLabel: 'Instagram @yosemite_crew',
    });
  });

  it('still audits when unreadable stored material was cleared', async () => {
    readInstagramConnectionMock.mockResolvedValue(null);
    await disconnectInstagramAction();
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'instagram', targetLabel: 'Instagram' })
    );
  });

  it('does not audit when no connection material was stored', async () => {
    readInstagramConnectionMock.mockResolvedValue(null);
    clearInstagramConnectionMock.mockResolvedValue(false);

    await expect(disconnectInstagramAction()).resolves.toEqual({
      ok: false,
      message: 'Instagram is not connected.',
    });
    expect(recordAuditEventMock).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/social');
  });

  it('reports an unconfigured host without clearing anything', async () => {
    getInstagramConfigMock.mockReturnValue(null);
    expect((await disconnectInstagramAction()).ok).toBe(false);
    expect(clearInstagramConnectionMock).not.toHaveBeenCalled();
  });

  it('does not touch the TikTok connection', async () => {
    await disconnectInstagramAction();
    expect(clearConnection).not.toHaveBeenCalled();
    expect(readConnection).not.toHaveBeenCalled();
  });
});
