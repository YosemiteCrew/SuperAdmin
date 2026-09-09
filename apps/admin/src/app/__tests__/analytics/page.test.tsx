import { render, screen } from '@testing-library/react';

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
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

    const row = screen.getByText('emailpassword').closest('tr');
    expect(row?.querySelector('svg')).toBeInTheDocument();
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
});
