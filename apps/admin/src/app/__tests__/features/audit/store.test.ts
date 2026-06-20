const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...args: unknown[]) => getUserMock(...args) },
}));

const getUserMetadataMock = jest.fn();
const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args),
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
  },
}));

jest.mock('@/app/config/backend', () => ({ ensureSuperTokensInit: jest.fn() }));

import {
  getAuditEventsForTarget,
  getRecentAuditEvents,
  recordAuditEvent,
} from '@/app/features/audit/store';
import type { AuditEvent } from '@/app/features/audit/types';

function event(over: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'e1',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    at: 1,
    ...over,
  };
}

beforeEach(() => {
  getUserMock.mockReset();
  getUserMetadataMock.mockReset();
  updateUserMetadataMock.mockReset();
  getUserMetadataMock.mockResolvedValue({ metadata: {} });
  updateUserMetadataMock.mockResolvedValue({ status: 'OK' });
});

describe('recordAuditEvent', () => {
  it('resolves actor + target emails and writes the new event at the front', async () => {
    getUserMock.mockImplementation((id: string) =>
      Promise.resolve({ emails: [id === 'admin-1' ? 'admin@x.com' : 'target@x.com'] })
    );
    getUserMetadataMock.mockResolvedValue({ metadata: { events: [event({ id: 'old' })] } });

    await recordAuditEvent({
      action: 'user.mfa_reset',
      actorId: 'admin-1',
      targetType: 'user',
      targetId: 'u-1',
    });

    expect(updateUserMetadataMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateUserMetadataMock.mock.calls[0];
    const events = payload.events as AuditEvent[];
    expect(events[0]).toMatchObject({
      action: 'user.mfa_reset',
      actorEmail: 'admin@x.com',
      targetLabel: 'target@x.com',
    });
    expect(events[1].id).toBe('old');
  });

  it('uses a provided label and does not look up the target for org events', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });

    await recordAuditEvent({
      action: 'org.verify',
      actorId: 'admin-1',
      targetType: 'organization',
      targetId: 'o-1',
      targetLabel: 'Acme Vet',
    });

    // Only the actor is resolved (one getUser call); the org label is passed through.
    expect(getUserMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateUserMetadataMock.mock.calls[0];
    expect((payload.events as AuditEvent[])[0].targetLabel).toBe('Acme Vet');
  });

  it('falls back to the id when the actor lookup throws', async () => {
    getUserMock.mockRejectedValue(new Error('boom'));
    await recordAuditEvent({
      action: 'org.suspend',
      actorId: 'admin-1',
      targetType: 'organization',
      targetId: 'o-1',
      targetLabel: 'Acme',
    });
    const [, payload] = updateUserMetadataMock.mock.calls[0];
    expect((payload.events as AuditEvent[])[0].actorEmail).toBe('admin-1');
  });

  it('falls back to the id when the user lookup returns no user', async () => {
    getUserMock.mockResolvedValue(null);
    await recordAuditEvent({
      action: 'user.session_revoke',
      actorId: 'admin-1',
      targetType: 'user',
      targetId: 'u-1',
    });
    const [, payload] = updateUserMetadataMock.mock.calls[0];
    const recorded = (payload.events as AuditEvent[])[0];
    expect(recorded.actorEmail).toBe('admin-1');
    expect(recorded.targetLabel).toBe('u-1');
  });

  it('never throws when the write fails', async () => {
    updateUserMetadataMock.mockRejectedValue(new Error('write failed'));
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    await expect(
      recordAuditEvent({
        action: 'user.delete',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: 'u-1',
        targetLabel: 'v@x.com',
      })
    ).resolves.toBeUndefined();
  });
});

describe('getRecentAuditEvents', () => {
  it('returns the most recent events and drops malformed entries', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: { events: [event({ id: 'a' }), { junk: true }, event({ id: 'b' })] },
    });
    const result = await getRecentAuditEvents(10);
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('respects the limit', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: { events: [event({ id: 'a' }), event({ id: 'b' }), event({ id: 'c' })] },
    });
    expect(await getRecentAuditEvents(2)).toHaveLength(2);
  });

  it('returns an empty array when the read throws', async () => {
    getUserMetadataMock.mockRejectedValue(new Error('down'));
    expect(await getRecentAuditEvents()).toEqual([]);
  });

  it('returns an empty array when there is no stored log', async () => {
    getUserMetadataMock.mockResolvedValue({ metadata: {} });
    expect(await getRecentAuditEvents()).toEqual([]);
  });
});

describe('getAuditEventsForTarget', () => {
  it('returns only events for the requested target', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        events: [
          event({ id: 'a', targetId: 'u-1' }),
          event({ id: 'b', targetId: 'u-2' }),
          event({ id: 'c', targetId: 'u-1' }),
        ],
      },
    });
    const result = await getAuditEventsForTarget('u-1');
    expect(result.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array on error', async () => {
    getUserMetadataMock.mockRejectedValue(new Error('down'));
    expect(await getAuditEventsForTarget('u-1')).toEqual([]);
  });
});
