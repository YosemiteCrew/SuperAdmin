jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn() },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { annotateApprovalStatuses, countPending } from '@/app/features/approvals/queue';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;

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
