import { render, screen } from '@testing-library/react';
import type { SessionInformation } from 'supertokens-node/recipe/session/types';

import { SessionsSection } from '@/app/(routes)/(dashboard)/users/[id]/SessionsSection';

jest.mock('@/app/(routes)/(dashboard)/users/[id]/actions', () => ({
  revokeAllSessionsAction: jest.fn(),
  revokeSessionAction: jest.fn(),
}));

const NOW = 1_750_000_000_000;
let nowSpy: jest.SpyInstance;

beforeEach(() => {
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  nowSpy.mockRestore();
});

function makeSession(handle: string, expiry: number): SessionInformation {
  return {
    sessionHandle: handle,
    userId: 'u-1',
    tenantId: 'public',
    timeCreated: NOW - 60_000,
    expiry,
    sessionDataInDatabase: {},
    customClaimsInAccessTokenPayload: {},
    recipeUserId: { getAsString: () => 'u-1' },
  } as unknown as SessionInformation;
}

describe('SessionsSection', () => {
  it('shows the empty state and no "Revoke all" when there are no sessions', () => {
    render(<SessionsSection sessions={[]} userId="u-1" />);
    expect(screen.getByText('Active sessions (0)')).toBeInTheDocument();
    expect(screen.getByText('No active sessions.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke all/i })).not.toBeInTheDocument();
  });

  it('renders a row per session with relative expiry labels and revoke controls', () => {
    const sessions = [
      makeSession('expired-handle-aaaaaaaaaa', NOW - 1000), // expired
      makeSession('soon-handle-bbbbbbbbbbbb', NOW + 30 * 60 * 1000), // minutes
      makeSession('hours-handle-cccccccccc', NOW + 5 * 60 * 60 * 1000), // hours
      makeSession('days-handle-dddddddddddd', NOW + 5 * 24 * 60 * 60 * 1000), // days
    ];
    render(<SessionsSection sessions={sessions} userId="u-1" />);

    expect(screen.getByText('Active sessions (4)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke all/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Revoke$/i })).toHaveLength(4);
    expect(screen.getByText('expired')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('5 hr')).toBeInTheDocument();
    expect(screen.getByText('5 days')).toBeInTheDocument();
    // handle is truncated to 16 chars + ellipsis
    expect(screen.getByText('expired-handle-a…')).toBeInTheDocument();
  });

  it('hides "Revoke all" when showRevokeAll is false (still allows per-session revoke)', () => {
    const sessions = [makeSession('only-handle-eeeeeeeeee', NOW + 60 * 60 * 1000)];
    render(<SessionsSection sessions={sessions} userId="u-1" showRevokeAll={false} />);
    expect(screen.queryByRole('button', { name: /Revoke all/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Revoke$/i })).toBeInTheDocument();
  });
});
