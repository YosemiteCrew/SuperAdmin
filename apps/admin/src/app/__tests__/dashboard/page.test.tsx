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

const loadOrganizationsMock = jest.fn();
jest.mock('@/app/features/organizations/load', () => ({
  loadOrganizations: (...args: unknown[]) => loadOrganizationsMock(...args),
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

function business(id: string, isVerified: boolean, isActive = true) {
  return {
    id,
    name: id,
    type: 'HOSPITAL',
    isVerified,
    isActive,
    memberCount: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getUserCountMock.mockResolvedValue(42);
  getUsersNewestFirstMock.mockResolvedValue({ users: [], nextPaginationToken: undefined });
  loadOrganizationsMock.mockResolvedValue({
    organizations: [
      business('waiting-1', false),
      business('waiting-2', false),
      business('verified', true),
      business('suspended', false, false),
    ],
    loadError: false,
  });
});

describe('DashboardPage', () => {
  it('counts the businesses waiting for approval on the production backend', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/dashboard/page');
    render(await mod.default());

    expect(loadOrganizationsMock).toHaveBeenCalledWith(false, 'production');
    expect(screen.getByText('Businesses awaiting approval')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Review queue →')).toBeInTheDocument();
  });

  it('reads the queue as clear when no business is waiting', async () => {
    loadOrganizationsMock.mockResolvedValue({
      organizations: [business('verified', true)],
      loadError: false,
    });
    const mod = await import('@/app/(routes)/(dashboard)/dashboard/page');
    render(await mod.default());

    expect(screen.getByText('Queue is clear')).toBeInTheDocument();
  });

  it('shows no count when the platform backend cannot be reached', async () => {
    loadOrganizationsMock.mockResolvedValue({ organizations: [], loadError: true });
    const mod = await import('@/app/(routes)/(dashboard)/dashboard/page');
    render(await mod.default());

    expect(screen.getByText('Could not reach the platform backend')).toBeInTheDocument();
    expect(screen.queryByText('Queue is clear')).not.toBeInTheDocument();
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
    expect(loadOrganizationsMock).not.toHaveBeenCalled();
  });
});
