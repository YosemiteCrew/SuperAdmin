jest.mock('server-only', () => ({}));

const ensureSuperTokensInitMock = jest.fn();
const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: () => ensureSuperTokensInitMock(),
  requireSuperAdmin: () => requireSuperAdminMock(),
}));

const normalizeCursorMock = jest.fn((value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined
);
jest.mock('@/app/features/contact/store', () => ({
  normalizeCursor: (value: unknown) => normalizeCursorMock(value),
}));

const listConsentSubjectsMock = jest.fn();
jest.mock('@/app/features/consent/store', () => ({
  listConsentSubjects: (...args: unknown[]) => listConsentSubjectsMock(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  listConsentSubjectsMock.mockResolvedValue({ subjects: [], nextCursor: null });
});

describe('ConsentPage', () => {
  it('treats repeated search and cursor params as a first-page request', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/consent/page');

    await mod.default({
      searchParams: Promise.resolve({ search: ['one', 'two'], cursor: ['a', 'b'] }),
    });

    expect(normalizeCursorMock).toHaveBeenCalledWith(['one', 'two']);
    expect(normalizeCursorMock).toHaveBeenCalledWith(['a', 'b']);
    expect(listConsentSubjectsMock).toHaveBeenCalledWith({
      search: undefined,
      cursor: undefined,
    });
  });

  it('trims a scalar search and keeps a scalar cursor', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/consent/page');

    await mod.default({
      searchParams: Promise.resolve({ search: '  clinic  ', cursor: 'cursor-1' }),
    });

    expect(listConsentSubjectsMock).toHaveBeenCalledWith({
      search: 'clinic',
      cursor: 'cursor-1',
    });
  });
});
