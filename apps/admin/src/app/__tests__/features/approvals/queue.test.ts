jest.mock('server-only', () => ({}));
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
  fetchApprovalCandidates,
} from '@/app/features/approvals/queue';
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
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ status: 'OK', metadata: {} });
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
    expect(rows[1]).toMatchObject({ id: 'u2', email: 'u2', status: 'pending' });
  });

  it('treats a failed metadata read as pending instead of throwing', async () => {
    mockGet.mockRejectedValue(new Error('core down'));
    const rows = await annotateApprovalStatuses(USERS);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'pending')).toBe(true);
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
