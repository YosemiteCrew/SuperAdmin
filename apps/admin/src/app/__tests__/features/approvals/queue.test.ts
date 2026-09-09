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

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersNewestFirst: jest.fn() },
}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn() },
}));

import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import {
  APPROVAL_USER_TYPE,
  annotateApprovalStatuses,
  countPending,
  countPendingApprovalCandidates,
  fetchApprovalCandidates,
  scanApprovalStatuses,
} from '@/app/features/approvals/queue';
import { logger } from '@/app/lib/logger';
import { recipeIdsForUserType } from '@/app/features/users/filter';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockGetUsers = supertokens.getUsersNewestFirst as jest.MockedFunction<
  typeof supertokens.getUsersNewestFirst
>;
type UsersPage = Awaited<ReturnType<typeof supertokens.getUsersNewestFirst>>;

const USERS = [
  { id: 'u1', emails: ['a@b.com'], timeJoined: 1000 },
  { id: 'u2', emails: [], timeJoined: 2000 },
];

beforeEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
  mockGet.mockResolvedValue({ status: 'OK', metadata: {} });
  statusFindManyMock.mockResolvedValue([]);
  statusUpsertMock.mockResolvedValue({ userId: 'u1' });
});

describe('annotateApprovalStatuses', () => {
  it('maps users to rows with derived statuses', async () => {
    mockGet
      .mockResolvedValueOnce({ status: 'OK', metadata: { approvedAt: 500 } })
      .mockResolvedValueOnce({ status: 'OK', metadata: {} });

    const rows = await annotateApprovalStatuses(USERS);
    expect(rows[0]).toMatchObject({
      id: 'u1',
      email: 'a@b.com',
      status: 'approved',
      decidedAt: 500,
    });
    expect(rows[1]).toMatchObject({
      id: 'u2',
      email: 'u2',
      status: 'pending',
    });
  });

  it('treats a failed metadata read as pending instead of throwing', async () => {
    mockGet.mockRejectedValue(new Error('core down'));
    const rows = await annotateApprovalStatuses(USERS);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
  });
});

describe('scanApprovalStatuses', () => {
  it('excludes failed metadata reads from the rows eligible for indexing', async () => {
    mockGet
      .mockResolvedValueOnce({ status: 'OK', metadata: { approvedAt: 500 } })
      .mockRejectedValueOnce(new Error('core down'));

    const scan = await scanApprovalStatuses(USERS);
    expect(scan.rows.map((row) => row.status)).toEqual(['approved', 'pending']);
    expect(scan.indexableRows.map((row) => row.id)).toEqual(['u1']);
  });
});

describe('countPending', () => {
  it('counts only pending rows', async () => {
    mockGet
      .mockResolvedValueOnce({ status: 'OK', metadata: { rejectedAt: 1 } })
      .mockResolvedValueOnce({ status: 'OK', metadata: {} });
    const rows = await annotateApprovalStatuses(USERS);
    expect(countPending(rows)).toBe(1);
  });
});

describe('fetchApprovalCandidates', () => {
  it('asks the core for business (email + password) accounts only', async () => {
    mockGetUsers.mockResolvedValue({
      users: USERS as unknown as UsersPage['users'],
      nextPaginationToken: undefined,
    });

    const users = await fetchApprovalCandidates(100);

    expect(mockGetUsers).toHaveBeenCalledTimes(1);
    expect(mockGetUsers).toHaveBeenCalledWith({
      tenantId: 'public',
      limit: 100,
      includeRecipeIds: ['emailpassword'],
    });
    expect(users).toEqual(USERS);
  });

  it('never lists mobile-app sign-in methods (passwordless, thirdparty)', () => {
    // The recipe filter is the whole guarantee that a pet parent cannot land in
    // the queue, so pin it against the directory's own definition of "business".
    const ids = recipeIdsForUserType(APPROVAL_USER_TYPE) ?? [];
    expect(ids).toEqual(['emailpassword']);
    expect(ids).not.toContain('passwordless');
    expect(ids).not.toContain('thirdparty');
  });
});

describe('countPendingApprovalCandidates', () => {
  it('uses complete indexed statuses without reading per-user metadata', async () => {
    statusFindManyMock.mockResolvedValue([
      { userId: 'u1', status: 'approved' },
      { userId: 'u2', status: 'pending' },
    ]);

    await expect(countPendingApprovalCandidates(USERS)).resolves.toBe(1);
    expect(mockGet).not.toHaveBeenCalled();
    expect(statusUpsertMock).not.toHaveBeenCalled();
  });

  it('reads metadata only for candidate ids missing from the index', async () => {
    statusFindManyMock.mockResolvedValue([{ userId: 'u1', status: 'approved' }]);
    mockGet.mockResolvedValueOnce({ status: 'OK', metadata: {} });

    await expect(countPendingApprovalCandidates(USERS)).resolves.toBe(1);
    expect(mockGet).toHaveBeenCalledWith('u2');
    expect(statusUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'u2' },
      update: { status: 'pending' },
      create: { userId: 'u2', status: 'pending' },
    });
  });

  it('falls back to the metadata recount when the database read fails', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    statusFindManyMock.mockRejectedValue(new Error('database down'));
    mockGet
      .mockResolvedValueOnce({ status: 'OK', metadata: { rejectedAt: 500 } })
      .mockResolvedValueOnce({ status: 'OK', metadata: {} });

    await expect(countPendingApprovalCandidates(USERS)).resolves.toBe(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      'Approval decision index read failed; recounting from metadata',
      { error: 'database down' }
    );
    errorSpy.mockRestore();
  });

  it('stringifies a non-Error database read failure', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    statusFindManyMock.mockRejectedValue('database down');

    await expect(countPendingApprovalCandidates(USERS)).resolves.toBe(2);
    expect(errorSpy).toHaveBeenCalledWith(
      'Approval decision index read failed; recounting from metadata',
      { error: 'database down' }
    );
    errorSpy.mockRestore();
  });

  it('does not persist a failed metadata read as pending', async () => {
    mockGet
      .mockResolvedValueOnce({ status: 'OK', metadata: { approvedAt: 500 } })
      .mockRejectedValueOnce(new Error('core down'));

    await expect(countPendingApprovalCandidates(USERS)).resolves.toBe(1);
    expect(statusUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { status: 'approved' },
      create: { userId: 'u1', status: 'approved' },
    });
    expect(statusUpsertMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u2' },
      })
    );
  });
});
