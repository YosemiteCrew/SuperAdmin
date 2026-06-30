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
  getAuditEventsForActor,
  getAuditEventsForTarget,
  getRecentAuditEvents,
  recordAuditEvent,
  verifyAuditChain,
} from '@/app/features/audit/store';
import type { AuditEvent, StoredAuditEvent } from '@/app/features/audit/types';
import { logger } from '@/app/lib/logger';

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

  it('swallows and stringifies a non-Error rejection', async () => {
    updateUserMetadataMock.mockRejectedValue('catastrophe');
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

describe('getAuditEventsForActor', () => {
  it('returns only events performed by the requested actor', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        events: [
          event({ id: 'a', actorId: 'admin-1' }),
          event({ id: 'b', actorId: 'admin-2' }),
          event({ id: 'c', actorId: 'admin-1' }),
        ],
      },
    });
    const result = await getAuditEventsForActor('admin-1');
    expect(result.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array on error', async () => {
    getUserMetadataMock.mockRejectedValue(new Error('down'));
    expect(await getAuditEventsForActor('admin-1')).toEqual([]);
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

// A stateful UserMetadata backing store: getUserMetadata returns the current
// array, updateUserMetadata replaces it. Both yield a microtask so concurrent
// callers interleave at their await points under jest's single thread — that
// interleaving is exactly what would lose an update without the store's write
// queue, so it doubles as the regression guard for the concurrency fix.
function useStatefulMetadata(): { current: () => StoredAuditEvent[] } {
  let events: StoredAuditEvent[] = [];
  getUserMetadataMock.mockImplementation(async () => {
    await Promise.resolve();
    return { metadata: { events: [...events] } };
  });
  updateUserMetadataMock.mockImplementation(
    async (_id: string, payload: { events: StoredAuditEvent[] }) => {
      await Promise.resolve();
      events = payload.events;
      return { status: 'OK' };
    }
  );
  return { current: () => events };
}

describe('recordAuditEvent concurrency', () => {
  it('serialises concurrent writes so no event is dropped', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    const store = useStatefulMetadata();

    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        recordAuditEvent({
          action: 'user.disable',
          actorId: 'admin-1',
          targetType: 'user',
          targetId: `u-${i}`,
          targetLabel: `u-${i}`,
        })
      )
    );

    const events = store.current();
    expect(events).toHaveLength(50);
    expect(new Set(events.map((e) => e.id)).size).toBe(50);
  });

  it('chains each event to the previous so the log stays verifiable', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    const store = useStatefulMetadata();
    for (let i = 0; i < 4; i += 1) {
      await recordAuditEvent({
        action: 'user.enable',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: `u-${i}`,
        targetLabel: `u-${i}`,
      });
    }
    getUserMetadataMock.mockResolvedValue({ metadata: { events: store.current() } });
    expect(await verifyAuditChain()).toEqual({ ok: true, length: 4, total: 4 });
  });

  it('keeps writing after a failed write so the queue is not poisoned', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    let events: StoredAuditEvent[] = [];
    let call = 0;
    getUserMetadataMock.mockImplementation(async () => ({ metadata: { events: [...events] } }));
    updateUserMetadataMock.mockImplementation(
      async (_id: string, payload: { events: StoredAuditEvent[] }) => {
        call += 1;
        if (call === 1) throw new Error('first write fails');
        events = payload.events;
        return { status: 'OK' };
      }
    );

    await Promise.all([
      recordAuditEvent({
        action: 'user.disable',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: 'u-1',
        targetLabel: 'u-1',
      }),
      recordAuditEvent({
        action: 'user.enable',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: 'u-2',
        targetLabel: 'u-2',
      }),
    ]);
    errorSpy.mockRestore();

    expect(events).toHaveLength(1);
    expect(events[0].targetId).toBe('u-2');
  });
});

describe('verifyAuditChain', () => {
  it('detects an event whose contents were altered after recording', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    const store = useStatefulMetadata();
    for (let i = 0; i < 3; i += 1) {
      await recordAuditEvent({
        action: 'role.grant',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: `u-${i}`,
        targetLabel: `u-${i}`,
      });
    }
    const tampered = store.current();
    tampered[1] = { ...tampered[1], actorEmail: 'attacker@x.com' };
    getUserMetadataMock.mockResolvedValue({ metadata: { events: tampered } });

    const status = await verifyAuditChain();
    expect(status.ok).toBe(false);
    expect(status.brokenAtId).toBe(tampered[1].id);
  });

  it('returns ok:false when the log cannot be read', async () => {
    getUserMetadataMock.mockRejectedValue(new Error('down'));
    expect(await verifyAuditChain()).toEqual({
      ok: false,
      length: 0,
      total: 0,
      reason: 'read-failed',
    });
  });
});

describe('reader projection', () => {
  it('returns public events without the internal chain fields', async () => {
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    const store = useStatefulMetadata();
    await recordAuditEvent({
      action: 'user.delete',
      actorId: 'admin-1',
      targetType: 'user',
      targetId: 'u-1',
      targetLabel: 'v@x.com',
    });
    getUserMetadataMock.mockResolvedValue({ metadata: { events: store.current() } });

    const [event] = await getRecentAuditEvents();
    expect(event).toEqual({
      id: expect.any(String),
      action: 'user.delete',
      actorId: 'admin-1',
      actorEmail: 'admin@x.com',
      targetType: 'user',
      targetId: 'u-1',
      targetLabel: 'v@x.com',
      at: expect.any(Number),
    });
    expect('hash' in event).toBe(false);
    expect('prevHash' in event).toBe(false);
  });
});

describe('recordAuditEvent observability', () => {
  it('logs an alertable error when the durable write fails (fail-open)', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    getUserMock.mockResolvedValue({ emails: ['admin@x.com'] });
    updateUserMetadataMock.mockRejectedValue(new Error('write failed'));

    await expect(
      recordAuditEvent({
        action: 'user.delete',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: 'u-1',
        targetLabel: 'v@x.com',
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});
