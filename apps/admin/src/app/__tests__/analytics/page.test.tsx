import { render, screen } from '@testing-library/react';

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

const getUserCountMock = jest.fn();
const getUsersNewestFirstMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    getUserCount: (...a: unknown[]) => getUserCountMock(...a),
    getUsersNewestFirst: (...a: unknown[]) => getUsersNewestFirstMock(...a),
  },
}));

jest.mock('@/app/features/analytics', () => ({
  getMFAStats: jest.fn(async () => ({ mfaEnabled: 0, total: 0, adoptionPct: 0 })),
}));

import AnalyticsPage from '@/app/(routes)/(dashboard)/analytics/page';

function makeUser(recipeId: string) {
  return { id: recipeId, timeJoined: Date.now(), loginMethods: [{ recipeId, verified: true }] };
}

describe('AnalyticsPage sign-in methods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a known recipe with its mapped icon', async () => {
    getUserCountMock.mockResolvedValue(1);
    getUsersNewestFirstMock.mockResolvedValue({ users: [makeUser('emailpassword')] });

    render(await AnalyticsPage());

    // The recipe id is what the core returns and what the icon map is keyed
    // on; the operator sees the words. Asserting both directions keeps the
    // mapping from being undone without this test noticing.
    const row = screen.getByText('Email and password').closest('tr');
    expect(row?.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('emailpassword')).not.toBeInTheDocument();
  });

  /**
   * `emailpassword`/`thirdparty`/`passwordless` are the only entries in
   * METHOD_ICONS. A recipe outside that set (e.g. a WebAuthn/passkey rollout)
   * is exactly the case the map's `string` key type claims cannot happen -
   * this is the runtime path the possibly-undefined typing makes provable.
   */
  it('falls back to a neutral icon for a sign-in method with no mapped entry', async () => {
    getUserCountMock.mockResolvedValue(1);
    getUsersNewestFirstMock.mockResolvedValue({ users: [makeUser('webauthn')] });

    render(await AnalyticsPage());

    const row = screen.getByText('webauthn').closest('tr');
    expect(row?.querySelector('svg')).toBeInTheDocument();
  });

  /**
   * The page must authorise for itself: a `redirect()` from the shared
   * dashboard layout does not stop React rendering the page beside it, and Next
   * serialises what rendered into the body of the 3xx response. See
   * __tests__/dashboardPageGuard.test.ts.
   */
  it('reads no data when the guard rejects the caller', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);

    await expect(AnalyticsPage()).rejects.toBe(redirected);
    expect(requireSuperAdminMock).toHaveBeenCalledWith('page');
    expect(getUserCountMock).not.toHaveBeenCalled();
    expect(getUsersNewestFirstMock).not.toHaveBeenCalled();
  });
});
