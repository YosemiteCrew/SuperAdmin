jest.mock('server-only', () => ({}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

const filterAuditEventsMock = jest.fn();
const paginateMock = jest.fn();
const parseAuditActionFilterMock = jest.fn();
const parseAuditDateMock = jest.fn();
const parsePageMock = jest.fn();
jest.mock('@/app/features/audit/filter', () => ({
  filterAuditEvents: (...args: unknown[]) => filterAuditEventsMock(...args),
  paginate: (...args: unknown[]) => paginateMock(...args),
  parseAuditActionFilter: (...args: unknown[]) => parseAuditActionFilterMock(...args),
  parseAuditDate: (...args: unknown[]) => parseAuditDateMock(...args),
  parsePage: (...args: unknown[]) => parsePageMock(...args),
}));

const getRecentAuditEventsMock = jest.fn();
const verifyAuditChainMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  getRecentAuditEvents: (...args: unknown[]) => getRecentAuditEventsMock(...args),
  verifyAuditChain: (...args: unknown[]) => verifyAuditChainMock(...args),
}));

jest.mock('@/app/features/audit/AuditIntegrityBanner', () => ({
  AuditIntegrityBanner: () => null,
}));
jest.mock('@/app/features/audit/AuditTable', () => ({ AuditTable: () => null }));
jest.mock('@/app/(routes)/(dashboard)/audit/ExportAuditButton', () => ({
  ExportAuditButton: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  parseAuditActionFilterMock.mockReturnValue('all');
  parseAuditDateMock.mockReturnValue(undefined);
  parsePageMock.mockReturnValue(1);
  filterAuditEventsMock.mockReturnValue([]);
  paginateMock.mockReturnValue({ items: [], page: 1, totalPages: 1, total: 0 });
  getRecentAuditEventsMock.mockResolvedValue([]);
  verifyAuditChainMock.mockResolvedValue({ status: 'empty' });
});

describe('AuditLogPage', () => {
  it('treats repeated query parameters as invalid input', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/audit/page');

    await mod.default({
      searchParams: Promise.resolve({
        action: ['org.verify', 'all'],
        q: ['first', 'second'],
        from: ['2026-01-01', '2026-02-01'],
        to: ['2026-03-01', '2026-04-01'],
        page: ['2', '3'],
      }),
    });

    expect(parseAuditActionFilterMock).toHaveBeenCalledWith(undefined);
    expect(parseAuditDateMock).toHaveBeenNthCalledWith(1, '', 'start');
    expect(parseAuditDateMock).toHaveBeenNthCalledWith(2, '', 'end');
    expect(parsePageMock).toHaveBeenCalledWith(undefined);
    expect(filterAuditEventsMock).toHaveBeenCalledWith([], {
      action: 'all',
      search: '',
      from: undefined,
      to: undefined,
    });
  });

  it('keeps scalar query parameters', async () => {
    parseAuditActionFilterMock.mockReturnValue('org.verify');
    parseAuditDateMock.mockReturnValueOnce(1).mockReturnValueOnce(2);
    parsePageMock.mockReturnValue(3);
    const mod = await import('@/app/(routes)/(dashboard)/audit/page');

    await mod.default({
      searchParams: Promise.resolve({
        action: 'org.verify',
        q: '  clinic  ',
        from: '2026-01-01',
        to: '2026-01-31',
        page: '3',
      }),
    });

    expect(parseAuditActionFilterMock).toHaveBeenCalledWith('org.verify');
    expect(parseAuditDateMock).toHaveBeenNthCalledWith(1, '2026-01-01', 'start');
    expect(parseAuditDateMock).toHaveBeenNthCalledWith(2, '2026-01-31', 'end');
    expect(parsePageMock).toHaveBeenCalledWith('3');
    expect(filterAuditEventsMock).toHaveBeenCalledWith([], {
      action: 'org.verify',
      search: 'clinic',
      from: 1,
      to: 2,
    });
  });
});
