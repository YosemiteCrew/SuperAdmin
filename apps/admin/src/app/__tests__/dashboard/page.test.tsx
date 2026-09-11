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

jest.mock('@/app/config/backend', () => ({ ensureSuperTokensInit: jest.fn() }));
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
});
