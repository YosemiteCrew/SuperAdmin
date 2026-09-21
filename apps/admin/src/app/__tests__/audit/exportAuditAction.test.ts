const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const getFilteredAuditEventsMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  getFilteredAuditEvents: (...args: unknown[]) => getFilteredAuditEventsMock(...args),
}));

import { exportAuditAction } from '@/app/(routes)/(dashboard)/audit/actions';

describe('exportAuditAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
    getFilteredAuditEventsMock.mockResolvedValue([
      {
        id: 'older-than-250',
        action: 'user.delete',
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        targetType: 'user',
        targetId: 'user-1',
        at: Date.parse('2026-01-02T00:00:00.000Z'),
      },
    ]);
  });

  it('guards and exports every event matching the parsed filters', async () => {
    const csv = await exportAuditAction({
      action: 'user.delete',
      search: ' admin ',
      from: '2026-01-01',
      to: '2026-01-02',
    });

    expect(requireSuperAdminMock).toHaveBeenCalledTimes(1);
    expect(getFilteredAuditEventsMock).toHaveBeenCalledWith({
      action: 'user.delete',
      search: 'admin',
      from: Date.parse('2026-01-01'),
      to: Date.parse('2026-01-02') + 24 * 60 * 60 * 1000 - 1,
    });
    expect(csv).toContain('admin@example.com,user,,user-1');
  });

  it('does not query when the authorization guard rejects', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);

    await expect(exportAuditAction({})).rejects.toBe(redirected);
    expect(getFilteredAuditEventsMock).not.toHaveBeenCalled();
  });

  it('coerces missing or untrusted filters to the unfiltered query', async () => {
    getFilteredAuditEventsMock.mockResolvedValue([]);

    await exportAuditAction({ action: 'not-an-action' });

    expect(getFilteredAuditEventsMock).toHaveBeenCalledWith({
      action: 'all',
      search: '',
      from: undefined,
      to: undefined,
    });
  });
});
