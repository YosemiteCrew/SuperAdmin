import { render, screen } from '@testing-library/react';

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const getAuditEventPageMock = jest.fn();
const verifyAuditChainMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  getAuditEventPage: (...args: unknown[]) => getAuditEventPageMock(...args),
  verifyAuditChain: (...args: unknown[]) => verifyAuditChainMock(...args),
}));

import AuditLogPage from '@/app/(routes)/(dashboard)/audit/page';

describe('AuditLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
    verifyAuditChainMock.mockResolvedValue({ ok: true, length: 51, total: 51 });
    getAuditEventPageMock.mockResolvedValue({
      items: [
        {
          id: 'older-than-250',
          action: 'user.delete',
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          targetType: 'user',
          targetId: 'user-1',
          at: Date.parse('2026-01-02T00:00:00.000Z'),
        },
      ],
      page: 2,
      totalPages: 3,
      total: 51,
      hasEvents: true,
    });
  });

  it('passes parsed filters and renders the database total', async () => {
    render(
      await AuditLogPage({
        searchParams: Promise.resolve({
          action: 'user.delete',
          q: ' admin ',
          from: '2026-01-01',
          to: '2026-01-02',
          page: '2',
        }),
      })
    );

    expect(getAuditEventPageMock).toHaveBeenCalledWith(
      {
        action: 'user.delete',
        search: 'admin',
        from: Date.parse('2026-01-01'),
        to: Date.parse('2026-01-02') + 24 * 60 * 60 * 1000 - 1,
      },
      2
    );
    expect(screen.getByText('Page 2 of 3 · 51 events')).toBeInTheDocument();
    expect(screen.getByText('Every privileged action, newest first')).toBeInTheDocument();
  });

  it('does not read data when the page guard rejects', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);

    await expect(AuditLogPage({ searchParams: Promise.resolve({}) })).rejects.toBe(redirected);
    expect(getAuditEventPageMock).not.toHaveBeenCalled();
  });
});
