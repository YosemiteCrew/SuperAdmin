jest.mock('server-only', () => ({}));

const ensureSuperTokensInitMock = jest.fn();
const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: () => ensureSuperTokensInitMock(),
  requireSuperAdmin: () => requireSuperAdminMock(),
}));

const countPendingMock = jest.fn();
const fetchApprovalCandidatesMock = jest.fn();
const scanApprovalStatusesMock = jest.fn();
jest.mock('@/app/features/approvals/queue', () => ({
  countPending: (...args: unknown[]) => countPendingMock(...args),
  fetchApprovalCandidates: (...args: unknown[]) => fetchApprovalCandidatesMock(...args),
  scanApprovalStatuses: (...args: unknown[]) => scanApprovalStatusesMock(...args),
}));

const refreshApprovalStatusIndexMock = jest.fn();
jest.mock('@/app/features/approvals/store', () => ({
  refreshApprovalStatusIndex: (...args: unknown[]) => refreshApprovalStatusIndexMock(...args),
}));
jest.mock('@/app/(routes)/(dashboard)/approvals/ApprovalsTable', () => ({
  ApprovalsTable: () => null,
}));

const CANDIDATES = [
  { id: 'business-1', emails: ['business@example.com'], timeJoined: 1_700_000_000_000 },
];
const ROWS = [
  {
    id: 'business-1',
    email: 'business@example.com',
    joinedAt: 1_700_000_000_000,
    status: 'pending',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  fetchApprovalCandidatesMock.mockResolvedValue(CANDIDATES);
  scanApprovalStatusesMock.mockResolvedValue({ rows: ROWS, indexableRows: ROWS });
  refreshApprovalStatusIndexMock.mockResolvedValue(undefined);
  countPendingMock.mockReturnValue(1);
});

describe('ApprovalsPage', () => {
  it('repairs the decision index from the exact approval-status scan', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/approvals/page');
    await mod.default({ searchParams: Promise.resolve({}) });

    expect(fetchApprovalCandidatesMock).toHaveBeenCalledWith(100);
    expect(scanApprovalStatusesMock).toHaveBeenCalledWith(CANDIDATES);
    expect(refreshApprovalStatusIndexMock).toHaveBeenCalledWith(ROWS);
  });
});
