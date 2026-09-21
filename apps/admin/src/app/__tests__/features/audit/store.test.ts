const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...args: unknown[]) => getUserMock(...args) },
}));

const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args) },
}));
jest.mock('@/app/config/backend', () => ({ ensureSuperTokensInit: jest.fn() }));

const findManyMock = jest.fn();
const countMock = jest.fn();
const databaseFindFirstMock = jest.fn();
const findFirstMock = jest.fn();
const createMock = jest.fn();
const createManyMock = jest.fn();
const executeRawMock = jest.fn();
const transactionMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: {
    auditEvent: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      count: (...args: unknown[]) => countMock(...args),
      findFirst: (...args: unknown[]) => databaseFindFirstMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import {
  getAuditEventsForActor,
  getAuditEventsForTarget,
  getAuditEventPage,
  getFilteredAuditEvents,
  getRecentAuditEvents,
  readAuditEventsInvolving,
  recordAuditEvent,
  tryRecordAuditEvent,
  verifyAuditChain,
} from '@/app/features/audit/store';
import { GENESIS_HASH, hashAuditEvent } from '@/app/features/audit/chain';
import type { AuditEvent } from '@/app/features/audit/types';
import { logger } from '@/app/lib/logger';

function event(over: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'e1',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'target@x.com',
    at: 1,
    ...over,
  };
}

function row(over: Partial<AuditEvent> = {}, prevHash = GENESIS_HASH) {
  const value = event(over);
  return {
    ...value,
    targetLabel: value.targetLabel ?? null,
    at: new Date(value.at),
    prevHash,
    hash: hashAuditEvent(prevHash, value),
  };
}

beforeEach(() => {
  getUserMock.mockReset().mockResolvedValue({ emails: ['admin@x.com'] });
  getUserMetadataMock.mockReset().mockResolvedValue({ metadata: {} });
  findManyMock.mockReset().mockResolvedValue([]);
  countMock.mockReset().mockResolvedValue(0);
  databaseFindFirstMock.mockReset().mockResolvedValue(null);
  findFirstMock.mockReset().mockResolvedValue(null);
  createMock.mockReset().mockResolvedValue(undefined);
  createManyMock.mockReset().mockResolvedValue({ count: 0 });
  executeRawMock.mockReset().mockResolvedValue(1);
  transactionMock.mockReset().mockImplementation(async (callback) =>
    callback({
      auditEvent: { findFirst: findFirstMock, create: createMock, createMany: createManyMock },
      $executeRaw: executeRawMock,
    })
  );
});

describe('recordAuditEvent', () => {
  it('serializes the hash-chain append in a database transaction', async () => {
    const previous = row({ id: 'old' });
    findFirstMock.mockResolvedValue(previous);
    getUserMock.mockImplementation(async (id: string) => ({
      emails: [id === 'admin-1' ? 'admin@x.com' : 'target@x.com'],
    }));

    await recordAuditEvent({
      action: 'user.mfa_reset',
      actorId: 'admin-1',
      targetType: 'user',
      targetId: 'u-1',
    });

    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({ orderBy: { seq: 'desc' } });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'user.mfa_reset',
        actorEmail: 'admin@x.com',
        targetLabel: 'target@x.com',
        prevHash: previous.hash,
        hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        at: expect.any(Date),
      }),
    });
  });

  it('uses genesis for the first event and preserves a supplied label', async () => {
    await recordAuditEvent({
      action: 'org.verify',
      actorId: 'admin-1',
      targetType: 'organization',
      targetId: 'o-1',
      targetLabel: 'Clinic',
    });
    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ prevHash: GENESIS_HASH, targetLabel: 'Clinic' }),
    });
  });

  it('imports and rechains legacy metadata before the first database append', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: { events: [event({ id: 'new-legacy', at: 2 }), event({ id: 'old-legacy' })] },
    });

    await recordAuditEvent({
      action: 'org.verify',
      actorId: 'admin-1',
      targetType: 'organization',
      targetId: 'o-1',
    });

    const imported = createManyMock.mock.calls[0][0].data;
    expect(imported.map(({ id }: { id: string }) => id)).toEqual(['old-legacy', 'new-legacy']);
    expect(imported[0].prevHash).toBe(GENESIS_HASH);
    expect(imported[1].prevHash).toBe(imported[0].hash);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ prevHash: imported[1].hash }),
    });
  });

  it('refuses to import a broken legacy chain', async () => {
    const olderEvent = event({ id: 'old-legacy' });
    const older = {
      ...olderEvent,
      prevHash: GENESIS_HASH,
      hash: hashAuditEvent(GENESIS_HASH, olderEvent),
    };
    const newerEvent = event({ id: 'new-legacy', at: 2 });
    const newer = {
      ...newerEvent,
      prevHash: older.hash,
      hash: hashAuditEvent(older.hash, newerEvent),
    };
    getUserMetadataMock.mockResolvedValue({
      metadata: { events: [{ ...newer, actorEmail: 'tampered@x.com' }, older] },
    });
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    await recordAuditEvent({
      action: 'org.verify',
      actorId: 'admin-1',
      targetType: 'organization',
      targetId: 'o-1',
    });

    expect(createManyMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Audit write failed; privileged action was not recorded',
      expect.objectContaining({ error: 'Legacy audit chain failed verification: content-altered' })
    );
    errorSpy.mockRestore();
  });

  it('falls back to ids when user lookup fails or has no email', async () => {
    getUserMock.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(null);
    await recordAuditEvent({
      action: 'user.disable',
      actorId: 'admin-1',
      targetType: 'user',
      targetId: 'u-1',
    });
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorEmail: 'admin-1', targetLabel: 'u-1' }),
    });
  });

  it('fails open and logs database write failures', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    transactionMock.mockRejectedValue('write failed');
    await expect(
      recordAuditEvent({
        action: 'user.delete',
        actorId: 'admin-1',
        targetType: 'user',
        targetId: 'u-1',
      })
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Audit write failed; privileged action was not recorded',
      expect.objectContaining({ error: 'write failed' })
    );
    errorSpy.mockRestore();
  });

  it('reports whether a caller-required audit write succeeded', async () => {
    await expect(
      tryRecordAuditEvent({
        action: 'privacy.subject_export',
        actorId: 'admin-1',
        targetType: 'data_request',
        targetId: 'dr-1',
      })
    ).resolves.toBe(true);

    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    transactionMock.mockRejectedValue(new Error('database unavailable'));
    await expect(
      tryRecordAuditEvent({
        action: 'privacy.subject_erase_authorize',
        actorId: 'admin-1',
        targetType: 'data_request',
        targetId: 'dr-1',
      })
    ).resolves.toBe(false);
    errorSpy.mockRestore();
  });
});

describe('audit readers', () => {
  it('keeps legacy history visible until the first database append', async () => {
    getUserMetadataMock.mockResolvedValue({ metadata: { events: [event({ id: 'legacy' })] } });
    await expect(getRecentAuditEvents()).resolves.toEqual([event({ id: 'legacy' })]);
  });

  it('orders and limits recent events while hiding chain fields', async () => {
    findManyMock.mockResolvedValue([row({ id: 'a' }), row({ id: 'b', targetLabel: undefined })]);
    const result = await getRecentAuditEvents(2);
    expect(findManyMock).toHaveBeenCalledWith({ orderBy: { seq: 'desc' }, take: 2 });
    expect(result.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(result[1]).not.toHaveProperty('targetLabel');
    expect(result[0]).not.toHaveProperty('hash');
  });

  it('filters actor and target queries in the database', async () => {
    findManyMock.mockResolvedValue([row()]);
    await expect(getAuditEventsForActor('admin-1', 3)).resolves.toHaveLength(1);
    expect(findManyMock).toHaveBeenLastCalledWith({
      where: { actorId: 'admin-1' },
      orderBy: { seq: 'desc' },
      take: 3,
    });
    await getAuditEventsForTarget('u-1', 4);
    expect(findManyMock).toHaveBeenLastCalledWith({
      where: { targetId: 'u-1' },
      orderBy: { seq: 'desc' },
      take: 4,
    });
  });

  it('filters legacy actor history before the first database append', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        events: [event({ id: 'match' }), event({ id: 'other', actorId: 'admin-2' })],
      },
    });

    await expect(getAuditEventsForActor('admin-1')).resolves.toEqual([event({ id: 'match' })]);
  });

  it('does not fall back to stale metadata when the database has other rows', async () => {
    databaseFindFirstMock.mockResolvedValue({ id: 'already-migrated' });
    getUserMetadataMock.mockResolvedValue({ metadata: { events: [event({ id: 'legacy' })] } });
    await expect(getAuditEventsForActor('missing')).resolves.toEqual([]);
    expect(getUserMetadataMock).not.toHaveBeenCalled();
  });

  it('returns empty display results on read failures', async () => {
    findManyMock.mockRejectedValue(new Error('down'));
    await expect(getRecentAuditEvents()).resolves.toEqual([]);
    await expect(getAuditEventsForActor('a')).resolves.toEqual([]);
    await expect(getAuditEventsForTarget('t')).resolves.toEqual([]);
  });

  it('keeps export read failures observable', async () => {
    findManyMock.mockRejectedValue(new Error('down'));
    await expect(readAuditEventsInvolving('u-1', 10)).rejects.toThrow('down');
  });

  it('loads both sides of a subject-access export', async () => {
    findManyMock.mockResolvedValue([row()]);
    const result = await readAuditEventsInvolving('u-1', 10);
    expect(result.asTarget).toHaveLength(1);
    expect(result.asActor).toHaveLength(1);
    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['action', { action: 'user.delete' as const }, { action: 'user.delete' }],
    ['from', { from: 1_000 }, { at: { gte: new Date(1_000) } }],
    ['to', { to: 2_000 }, { at: { lte: new Date(2_000) } }],
    [
      'search',
      { search: ' Alice ' },
      {
        OR: [
          { actorEmail: { contains: 'Alice', mode: 'insensitive' } },
          { targetLabel: { contains: 'Alice', mode: 'insensitive' } },
          { targetId: { contains: 'Alice', mode: 'insensitive' } },
        ],
      },
    ],
  ])('passes the %s filter to the database count', async (_name, options, where) => {
    databaseFindFirstMock.mockResolvedValue({ id: 'stored' });

    await getAuditEventPage(options, 1);

    expect(countMock).toHaveBeenCalledWith({ where });
  });

  it('uses one combined where for count and database paging', async () => {
    countMock.mockResolvedValue(51);
    findManyMock.mockResolvedValue([row({ id: 'old-match' })]);
    const options = {
      action: 'user.delete' as const,
      search: 'target',
      from: 1_000,
      to: 2_000,
    };

    await expect(getAuditEventPage(options, 3)).resolves.toEqual({
      items: [event({ id: 'old-match' })],
      page: 3,
      totalPages: 3,
      total: 51,
      hasEvents: true,
    });

    const where = {
      action: 'user.delete',
      at: { gte: new Date(1_000), lte: new Date(2_000) },
      OR: [
        { actorEmail: { contains: 'target', mode: 'insensitive' } },
        { targetLabel: { contains: 'target', mode: 'insensitive' } },
        { targetId: { contains: 'target', mode: 'insensitive' } },
      ],
    };
    expect(countMock).toHaveBeenCalledWith({ where });
    expect(findManyMock).toHaveBeenCalledWith({
      where,
      orderBy: { seq: 'desc' },
      skip: 50,
      take: 25,
    });
  });

  it('does not use legacy rows when a filtered database query has no matches', async () => {
    databaseFindFirstMock.mockResolvedValue({ id: 'stored' });
    getUserMetadataMock.mockResolvedValue({ metadata: { events: [event({ id: 'legacy' })] } });

    await expect(getAuditEventPage({ action: 'user.delete' }, 1)).resolves.toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      hasEvents: true,
    });
    expect(getUserMetadataMock).not.toHaveBeenCalled();
  });

  it('filters and pages legacy rows only while the database is empty', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        events: [event({ id: 'match' }), event({ id: 'other', action: 'org.verify' })],
      },
    });

    await expect(getAuditEventPage({ action: 'user.delete' }, 1)).resolves.toEqual({
      items: [event({ id: 'match' })],
      page: 1,
      totalPages: 1,
      total: 1,
      hasEvents: true,
    });
  });

  it('reads every filtered database row for export without a page limit', async () => {
    findManyMock.mockResolvedValue([row({ id: 'older-than-250' })]);

    await expect(getFilteredAuditEvents({ action: 'user.delete' })).resolves.toEqual([
      event({ id: 'older-than-250' }),
    ]);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { action: 'user.delete' },
      orderBy: { seq: 'desc' },
    });
  });

  it('does not export stale legacy rows when the database has non-matching rows', async () => {
    databaseFindFirstMock.mockResolvedValue({ id: 'stored' });
    getUserMetadataMock.mockResolvedValue({ metadata: { events: [event({ id: 'legacy' })] } });

    await expect(getFilteredAuditEvents({ search: 'missing' })).resolves.toEqual([]);
    expect(getUserMetadataMock).not.toHaveBeenCalled();
  });

  it('filters legacy rows for export while the database is empty', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        events: [event({ id: 'match' }), event({ id: 'other', action: 'org.verify' })],
      },
    });

    await expect(getFilteredAuditEvents({ action: 'user.delete' })).resolves.toEqual([
      event({ id: 'match' }),
    ]);
  });

  it('returns an empty page when the durable read fails', async () => {
    countMock.mockRejectedValue(new Error('down'));

    await expect(getAuditEventPage({}, 1)).resolves.toEqual({
      items: [],
      page: 1,
      totalPages: 1,
      total: 0,
      hasEvents: false,
    });
  });
});

describe('verifyAuditChain', () => {
  it('verifies the durable chain', async () => {
    const older = row({ id: 'older' });
    const newer = row({ id: 'newer', at: 2 }, older.hash);
    findManyMock.mockResolvedValue([newer, older]);
    await expect(verifyAuditChain()).resolves.toEqual({ ok: true, length: 2, total: 2 });
  });

  it('detects an invalid stored action', async () => {
    findManyMock.mockResolvedValue([row({ action: 'invalid' as AuditEvent['action'] })]);
    await expect(verifyAuditChain()).resolves.toEqual({
      ok: false,
      length: 0,
      total: 1,
      brokenAtId: 'e1',
      reason: 'invalid-record',
    });
  });

  it('detects an invalid legacy action without filtering it out', async () => {
    getUserMetadataMock.mockResolvedValue({
      metadata: { events: [event({ action: 'invalid' as AuditEvent['action'] })] },
    });
    await expect(verifyAuditChain()).resolves.toEqual({
      ok: false,
      length: 0,
      total: 1,
      brokenAtId: 'e1',
      reason: 'invalid-record',
    });
  });

  it('reports a read failure', async () => {
    findManyMock.mockRejectedValue(new Error('down'));
    await expect(verifyAuditChain()).resolves.toEqual({
      ok: false,
      length: 0,
      total: 0,
      reason: 'read-failed',
    });
  });
});
