import { render, screen, within } from '@testing-library/react';

jest.mock('server-only', () => ({}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));
jest.mock('@/app/config', () => ({
  config: {
    api: {
      baseUrls: {
        production: 'https://api.example.com',
        development: 'https://api-dev.example.com',
      },
    },
  },
}));
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({ get: () => 'session=present' }),
}));
jest.mock('@/app/lib/serverTime', () => ({
  getServerTimestamp: () => Date.parse('2026-09-29T12:00:00.000Z'),
}));

const listOrganizationsMock = jest.fn();
jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  listOrganizations: (...args: unknown[]) => listOrganizationsMock(...args),
}));
jest.mock('@/app/(routes)/(dashboard)/organizations/OrganizationAvatar', () => ({
  OrganizationAvatar: () => null,
}));
const rowActionsMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/organizations/OrganizationRowActions', () => ({
  OrganizationRowActions: (
    props: Readonly<{ name: string; state: string; environment: string }>
  ) => {
    rowActionsMock(props);
    return <span>{`actions for ${props.name}`}</span>;
  },
}));

const ORGS = [
  {
    id: 'org-new',
    name: 'Newer Vets',
    type: 'HOSPITAL',
    isVerified: false,
    isActive: true,
    memberCount: 1,
    createdAt: '2026-09-28T09:00:00.000Z',
    website: 'newervets.example',
  },
  {
    id: 'org-verified',
    name: 'Verified Vets',
    type: 'HOSPITAL',
    isVerified: true,
    isActive: true,
    memberCount: 4,
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'org-old',
    name: 'Older Groomers',
    type: 'GROOMER',
    isVerified: false,
    isActive: true,
    memberCount: 3,
    createdAt: '2026-09-12T09:00:00.000Z',
    phoneNo: '+44 20 7946 0000',
    taxId: 'GB123456789',
  },
  {
    id: 'org-suspended',
    name: 'Suspended Boarders',
    type: 'BOARDER',
    isVerified: false,
    isActive: false,
    memberCount: 2,
    createdAt: '2026-09-01T09:00:00.000Z',
  },
];

const PAGE = '@/app/(routes)/(dashboard)/approvals/page';

async function renderPage(searchParams: Record<string, string | string[]> = {}) {
  const mod = await import(PAGE);
  render(await mod.default({ searchParams: Promise.resolve(searchParams) }));
}

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  listOrganizationsMock.mockResolvedValue(ORGS);
});

describe('ApprovalsPage', () => {
  it('lists only businesses waiting for verification, longest wait first', async () => {
    await renderPage();

    expect(listOrganizationsMock).toHaveBeenCalledWith({
      headers: { cookie: 'session=present' },
      baseUrl: 'https://api.example.com',
    });
    expect(screen.getByText('2 waiting')).toBeInTheDocument();

    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole('link', { name: 'Older Groomers' })).toHaveAttribute(
      'href',
      '/organizations/org-old'
    );
    expect(within(cards[0]).getByText('Waiting 17 days')).toBeInTheDocument();
    expect(within(cards[0]).getByText('GB123456789')).toBeInTheDocument();
    expect(within(cards[1]).getByRole('link', { name: 'Newer Vets' })).toBeInTheDocument();
    expect(within(cards[1]).getByText('Waiting 1 day')).toBeInTheDocument();
    expect(within(cards[1]).getAllByText('Not provided')).toHaveLength(2);

    expect(screen.queryByText('Verified Vets')).not.toBeInTheDocument();
    expect(screen.queryByText('Suspended Boarders')).not.toBeInTheDocument();
    expect(rowActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Older Groomers',
        state: 'pending',
        environment: 'production',
      })
    );
  });

  it('never lists individual accounts', async () => {
    await renderPage();

    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
  });

  it('reads and acts on the backend the reviewer picked', async () => {
    await renderPage({ env: 'development' });

    expect(listOrganizationsMock).toHaveBeenCalledWith({
      headers: { cookie: 'session=present' },
      baseUrl: 'https://api-dev.example.com',
    });
    expect(screen.getByRole('link', { name: 'Older Groomers' })).toHaveAttribute(
      'href',
      '/organizations/org-old?env=development'
    );
    expect(rowActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'development' })
    );
  });

  it('uses the demo businesses without calling a backend', async () => {
    await renderPage({ demo: '1' });

    expect(listOrganizationsMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Organizations' })).toHaveAttribute(
      'href',
      '/organizations?demo=1'
    );
  });

  it('says the queue is clear when nothing is waiting', async () => {
    listOrganizationsMock.mockResolvedValue([ORGS[1]]);
    await renderPage();

    expect(screen.getByText('No businesses waiting for approval.')).toBeInTheDocument();
    expect(screen.getByText('0 waiting')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('names the backend it could not reach instead of an empty queue', async () => {
    listOrganizationsMock.mockRejectedValue(new Error('connect ECONNREFUSED'));
    await renderPage();

    expect(
      screen.getByText(
        "Couldn't reach the platform backend at https://api.example.com/v1/super-admin/businesses. Error: connect ECONNREFUSED"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No businesses waiting for approval.')).not.toBeInTheDocument();
    expect(screen.queryByText(/waiting$/)).not.toBeInTheDocument();
  });

  it('reads no data when the guard rejects the caller', async () => {
    const redirected = Symbol('redirected');
    requireSuperAdminMock.mockRejectedValueOnce(redirected);
    const mod = await import(PAGE);

    await expect(mod.default({ searchParams: Promise.resolve({}) })).rejects.toBe(redirected);
    expect(requireSuperAdminMock).toHaveBeenCalledWith('page');
    expect(listOrganizationsMock).not.toHaveBeenCalled();
  });
});
