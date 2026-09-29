import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(async () => ({ userId: 'admin-1' })),
}));
jest.mock('@/app/features/contact/link', () => ({
  linkEmailsToAccounts: jest.fn(async () => new Map()),
}));
jest.mock('@/app/(routes)/(dashboard)/crm/requests/StatusControl', () => ({
  StatusControl: () => null,
}));

const listMock = jest.fn();
const countMock = jest.fn();
jest.mock('@/app/features/contact/store', () => ({
  ...jest.requireActual('@/app/features/contact/store'),
  listContactRequests: (...args: unknown[]) => listMock(...args),
  countRequestsByStatus: () => countMock(),
}));

const PAGE = '@/app/(routes)/(dashboard)/crm/requests/page';

async function renderPage(status?: string) {
  const mod = await import(PAGE);
  render(await mod.default({ searchParams: Promise.resolve(status ? { status } : {}) }));
}

beforeEach(() => {
  jest.clearAllMocks();
  listMock.mockResolvedValue({ requests: [], nextCursor: null });
  countMock.mockResolvedValue({ new: 2, in_progress: 0, closed: 1, spam: 442 });
});

describe('Contact requests page', () => {
  it('puts Spam after All, with its own count', async () => {
    await renderPage();

    const tabs = screen.getAllByRole('link').map((link) => link.textContent);
    expect(tabs).toEqual(['New2', 'In progress', 'Closed1', 'All', 'Spam442']);
    expect(screen.getByRole('link', { name: 'Spam 442' })).toHaveAttribute(
      'href',
      '/crm/requests?status=spam'
    );
  });

  it('asks the store for everything but spam on All', async () => {
    await renderPage('all');
    expect(listMock).toHaveBeenCalledWith({ status: undefined, cursor: undefined });
  });

  it('lists spam only under the Spam filter', async () => {
    await renderPage('spam');
    expect(listMock).toHaveBeenCalledWith({ status: 'spam', cursor: undefined });
  });
});
