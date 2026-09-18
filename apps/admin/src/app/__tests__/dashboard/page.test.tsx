import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}));

const getUserCountMock = jest.fn();
const getUsersNewestFirstMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUserCount: (...args: unknown[]) => getUserCountMock(...args),
    getUsersNewestFirst: (...args: unknown[]) => getUsersNewestFirstMock(...args),
  },
}));

const countPendingApprovalCandidatesMock = jest.fn();
const fetchApprovalCandidatesMock = jest.fn();
jest.mock('@/app/features/approvals/queue', () => ({
  countPendingApprovalCandidates: (...args: unknown[]) =>
    countPendingApprovalCandidatesMock(...args),
  fetchApprovalCandidates: (...args: unknown[]) => fetchApprovalCandidatesMock(...args),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));
jest.mock('@/app/features/audit/store', () => ({ getRecentAuditEvents: jest.fn(async () => []) }));
jest.mock('@/app/features/audit/AuditTimeline', () => ({
  AuditTimeline: () => <div data-testid="audit-timeline" />,
}));

const CANDIDATES = [
  { id: 'business-1', emails: ['business@example.com'], timeJoined: 1_700_000_000_000 },
];

beforeEach(() => {
  jest.clearAllMocks();
  getUserCountMock.mockResolvedValue(42);
  getUsersNewestFirstMock.mockResolvedValue({ users: [], nextPaginationToken: undefined });
  fetchApprovalCandidatesMock.mockResolvedValue(CANDIDATES);
  countPendingApprovalCandidatesMock.mockResolvedValue(7);
});

describe('DashboardPage', () => {
  it('renders the pending count from the derived-index helper', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/dashboard/page');
    render(await mod.default());

    expect(countPendingApprovalCandidatesMock).toHaveBeenCalledWith(CANDIDATES);
    expect(screen.getByText('Pending approvals')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  /**
   * The page must authorise for itself. The dashboard layout also calls the
   * guard, but a layout `redirect()` does not stop React rendering the page
   * beside it - Next then serialises the rendered payload into the body of the
   * 3xx response, which is how an account with no super-admin role read this
   * page's data. See __tests__/dashboardPageGuard.test.ts.
   */
  it('reads no data when the guard rejects the caller', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);

    const mod = await import('@/app/(routes)/(dashboard)/dashboard/page');

    await expect(mod.default()).rejects.toBe(redirected);
    expect(requireSuperAdminMock).toHaveBeenCalledWith('page');
    expect(getUserCountMock).not.toHaveBeenCalled();
    expect(getUsersNewestFirstMock).not.toHaveBeenCalled();
    expect(fetchApprovalCandidatesMock).not.toHaveBeenCalled();
  });
});
