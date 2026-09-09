jest.mock('server-only', () => ({}));

const statusFindManyMock = jest.fn();
const statusUpsertMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: {
    approvalStatusIndex: {
      findMany: (...args: unknown[]) => statusFindManyMock(...args),
      upsert: (...args: unknown[]) => statusUpsertMock(...args),
    },
  },
}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import {
  approveAccount,
  deriveApprovalState,
  getIndexedApprovalStatuses,
  getApprovalState,
  refreshApprovalStatusIndex,
  rejectAccount,
} from '@/app/features/approvals/store';
import { logger } from '@/app/lib/logger';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

beforeEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
  mockGet.mockResolvedValue({ status: 'OK', metadata: {} });
  mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });
  statusFindManyMock.mockResolvedValue([]);
  statusUpsertMock.mockResolvedValue({ userId: 'u1' });
});

describe('deriveApprovalState', () => {
  it('reads pending when no decision fields exist', () => {
    expect(deriveApprovalState({}).status).toBe('pending');
  });

  it('reads approved from approvedAt', () => {
    const state = deriveApprovalState({ approvedAt: 1000, approvedBy: 'admin-1' });
    expect(state.status).toBe('approved');
    expect(state.approvedBy).toBe('admin-1');
  });

  it('reads rejected from rejectedAt', () => {
    const state = deriveApprovalState({ rejectedAt: 2000, rejectedBy: 'admin-1' });
    expect(state.status).toBe('rejected');
  });

  it('rejection takes precedence over approval', () => {
    expect(deriveApprovalState({ approvedAt: 1000, rejectedAt: 2000 }).status).toBe('rejected');
  });

  it('ignores non-numeric timestamps', () => {
    expect(deriveApprovalState({ approvedAt: 'yes', rejectedAt: null }).status).toBe('pending');
  });
});

describe('getApprovalState', () => {
  it('derives state from the user metadata read', async () => {
    mockGet.mockResolvedValue({ status: 'OK', metadata: { approvedAt: 5 } });
    const state = await getApprovalState('u1');
    expect(state.status).toBe('approved');
    expect(mockGet).toHaveBeenCalledWith('u1');
  });
});

describe('approveAccount', () => {
  it('stamps approvedAt/approvedBy and clears rejection fields', async () => {
    const result = await approveAccount({ userId: 'u1', actorId: 'admin-1' });

    const [id, payload] = mockUpdate.mock.calls[0];
    expect(id).toBe('u1');
    expect(typeof payload.approvedAt).toBe('number');
    expect(payload.approvedBy).toBe('admin-1');
    expect(payload.rejectedAt).toBeNull();
    expect(payload.rejectedBy).toBeNull();
    expect(payload.rejectionDisabled).toBeNull();
    expect(result.stillDisabled).toBe(false);
    expect(statusUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { status: 'approved' },
      create: { userId: 'u1', status: 'approved' },
    });
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      statusUpsertMock.mock.invocationCallOrder[0]
    );
  });

  it('does not touch disabledAt for accounts that were never rejected', async () => {
    await approveAccount({ userId: 'u1', actorId: 'admin-1' });
    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload).not.toHaveProperty('disabledAt');
  });

  it('lifts a disable that the rejection itself created', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: { rejectedAt: 1000, disabledAt: 1000, rejectionDisabled: true },
    });
    const result = await approveAccount({ userId: 'u1', actorId: 'admin-1' });
    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload.disabledAt).toBeNull();
    expect(payload.disabledBy).toBeNull();
    expect(result.stillDisabled).toBe(false);
  });

  it('preserves a manual disable and reports stillDisabled', async () => {
    // Manually disabled account (no rejectionDisabled marker) — approval must
    // NOT lift the disable even if a rejection was layered on top of it.
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: { rejectedAt: 2000, disabledAt: 1000 },
    });
    const result = await approveAccount({ userId: 'u1', actorId: 'admin-1' });
    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload).not.toHaveProperty('disabledAt');
    expect(payload).not.toHaveProperty('disabledBy');
    expect(result.stillDisabled).toBe(true);
  });

  it('does not index a decision when the metadata write fails', async () => {
    mockUpdate.mockRejectedValue(new Error('metadata down'));

    await expect(approveAccount({ userId: 'u1', actorId: 'admin-1' })).rejects.toThrow(
      'metadata down'
    );
    expect(statusUpsertMock).not.toHaveBeenCalled();
  });

  it('keeps the authoritative decision when the derived index write fails', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    statusUpsertMock.mockRejectedValue(new Error('database down'));

    await expect(approveAccount({ userId: 'u1', actorId: 'admin-1' })).resolves.toEqual({
      stillDisabled: false,
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Approval decision index write failed', {
      error: 'database down',
    });
    errorSpy.mockRestore();
  });
});

describe('rejectAccount', () => {
  it('stamps rejection, disables the account, and clears approval', async () => {
    await rejectAccount({ userId: 'u1', actorId: 'admin-1' });

    const [id, payload] = mockUpdate.mock.calls[0];
    expect(id).toBe('u1');
    expect(typeof payload.rejectedAt).toBe('number');
    expect(payload.rejectedBy).toBe('admin-1');
    expect(payload.disabledAt).toBe(payload.rejectedAt);
    expect(payload.rejectionDisabled).toBe(true);
    expect(payload.approvedAt).toBeNull();
    expect(statusUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { status: 'rejected' },
      create: { userId: 'u1', status: 'rejected' },
    });
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      statusUpsertMock.mock.invocationCallOrder[0]
    );
  });

  it('preserves a pre-existing manual disable instead of overwriting it', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: { disabledAt: 1000, disabledBy: 'other-admin' },
    });
    await rejectAccount({ userId: 'u1', actorId: 'admin-1' });

    const [, payload] = mockUpdate.mock.calls[0];
    expect(payload).not.toHaveProperty('disabledAt');
    expect(payload).not.toHaveProperty('disabledBy');
    expect(payload).not.toHaveProperty('rejectionDisabled');
    expect(typeof payload.rejectedAt).toBe('number');
  });
});

describe('getIndexedApprovalStatuses', () => {
  it('returns valid indexed statuses for the candidate window', async () => {
    statusFindManyMock.mockResolvedValue([
      { userId: 'u1', status: 'pending' },
      { userId: 'u2', status: 'approved' },
      { userId: 'u3', status: 'invalid' },
    ]);

    await expect(getIndexedApprovalStatuses(['u1', 'u2', 'u3'])).resolves.toEqual(
      new Map([
        ['u1', 'pending'],
        ['u2', 'approved'],
      ])
    );
    expect(statusFindManyMock).toHaveBeenCalledWith({
      where: { userId: { in: ['u1', 'u2', 'u3'] } },
      select: { userId: true, status: true },
    });
  });

  it('returns an empty map for an empty window without touching the database', async () => {
    await expect(getIndexedApprovalStatuses([])).resolves.toEqual(new Map());
    expect(statusFindManyMock).not.toHaveBeenCalled();
  });
});

describe('refreshApprovalStatusIndex', () => {
  it('upserts every successfully read status', async () => {
    await refreshApprovalStatusIndex([
      { id: 'u1', status: 'approved' },
      { id: 'u2', status: 'pending' },
    ]);

    expect(statusUpsertMock).toHaveBeenCalledTimes(2);
    expect(statusUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'u2' },
      update: { status: 'pending' },
      create: { userId: 'u2', status: 'pending' },
    });
  });

  it('logs and swallows a refresh failure', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    statusUpsertMock.mockRejectedValue('database down');

    await expect(refreshApprovalStatusIndex([{ id: 'u1', status: 'approved' }])).resolves.toBe(
      false
    );
    expect(errorSpy).toHaveBeenCalledWith('Approval decision index refresh failed', {
      error: 'database down',
    });
    errorSpy.mockRestore();
  });
});
