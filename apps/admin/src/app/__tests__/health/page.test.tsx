import { render, screen } from '@testing-library/react';

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const collectSystemHealthMock = jest.fn();
jest.mock('@/app/features/health', () => ({
  collectSystemHealth: (...args: unknown[]) => collectSystemHealthMock(...args),
  formatUptime: () => '1h 2m',
}));

jest.mock('@/app/lib/serverTime', () => ({
  getServerTimestamp: () => Date.parse('2026-09-18T20:00:00.000Z'),
}));

import HealthPage from '@/app/(routes)/(dashboard)/health/page';
import type { SystemHealth } from '@/app/features/health/types';

const HEALTH: SystemHealth = {
  supertokens: { status: 'ok', latencyMs: 4 },
  contactIntake: {
    keyConfigured: true,
    newestSubmissionAt: new Date('2026-09-18T18:00:00.000Z'),
  },
  totalUsers: 42,
  adminCount: 2,
  memory: { rssmb: 100, heapUsedMb: 40, heapTotalMb: 80 },
  uptimeSec: 3720,
  nodeVersion: 'v24.0.0',
  env: 'test',
  buildSha: 'abcdef123',
};

describe('System Health page contact intake', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    collectSystemHealthMock.mockResolvedValue(HEALTH);
  });

  it('shows the key state and newest submission in UTC with its age', async () => {
    render(await HealthPage());

    expect(screen.getByText('Contact intake')).toBeInTheDocument();
    expect(screen.getByText('Configured')).toBeInTheDocument();
    expect(screen.getByText(/Sep 18, 2026.*UTC/)).toBeInTheDocument();
    expect(screen.getByText('2 hr ago')).toBeInTheDocument();
  });

  it('distinguishes an empty contact table from a failed query', async () => {
    collectSystemHealthMock.mockResolvedValueOnce({
      ...HEALTH,
      contactIntake: { keyConfigured: true, newestSubmissionAt: null },
    });
    const { unmount } = render(await HealthPage());
    expect(screen.getByText('None received')).toBeInTheDocument();
    unmount();

    collectSystemHealthMock.mockResolvedValueOnce({
      ...HEALTH,
      contactIntake: { keyConfigured: true, newestSubmissionAt: 'unavailable' },
    });
    render(await HealthPage());
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('shows an absent shared key without hiding stored submission state', async () => {
    collectSystemHealthMock.mockResolvedValueOnce({
      ...HEALTH,
      contactIntake: { ...HEALTH.contactIntake, keyConfigured: false },
    });

    render(await HealthPage());

    expect(screen.getByText('Not configured')).toBeInTheDocument();
    expect(screen.getByText('2 hr ago')).toBeInTheDocument();
  });

  it('reads no health data when the page guard rejects the caller', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);

    await expect(HealthPage()).rejects.toBe(redirected);
    expect(requireSuperAdminMock).toHaveBeenCalledWith('page');
    expect(collectSystemHealthMock).not.toHaveBeenCalled();
  });
});
