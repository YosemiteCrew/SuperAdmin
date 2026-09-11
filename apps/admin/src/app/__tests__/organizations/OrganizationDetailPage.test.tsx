import { render, screen } from '@testing-library/react';

const getOrganization = jest.fn();
const listOrganizationMembers = jest.fn();
const getOrgNotes = jest.fn();

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
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({ get: () => '' }),
}));

jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  getOrganization: (...args: unknown[]) => getOrganization(...args),
  listOrganizationMembers: (...args: unknown[]) => listOrganizationMembers(...args),
}));

jest.mock('@/app/features/organizations/notes', () => ({
  getOrgNotes: (...args: unknown[]) => getOrgNotes(...args),
}));

jest.mock('@/app/(routes)/(dashboard)/organizations/[id]/OrgNotes', () => ({
  OrgNotes: () => <div data-testid="org-notes" />,
}));

jest.mock('@/app/(routes)/(dashboard)/organizations/OrganizationRowActions', () => ({
  OrganizationRowActions: () => <div data-testid="row-actions" />,
}));

import OrganizationDetailPage, {
  generateMetadata,
} from '@/app/(routes)/(dashboard)/organizations/[id]/page';

const ORG = {
  id: 'org-1',
  name: 'Acme Vet',
  type: 'HOSPITAL' as const,
  isVerified: true,
  isActive: true,
  memberCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const renderPage = async (env?: string) =>
  render(
    await OrganizationDetailPage({
      params: Promise.resolve({ id: 'org-1' }),
      searchParams: Promise.resolve({ env }),
    })
  );

describe('OrganizationDetailPage members section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOrganization.mockResolvedValue(ORG);
    getOrgNotes.mockResolvedValue([]);
  });

  it('lists the members alongside the count', async () => {
    listOrganizationMembers.mockResolvedValue([
      { userId: 'user-1', roleCode: 'doctor', since: '2026-07-01T09:00:00.000Z' },
    ]);

    await renderPage();

    expect(screen.getByRole('link', { name: 'user-1' })).toHaveAttribute('href', '/users/user-1');
  });

  it('keeps the rest of the page when the members endpoint is not deployed yet', async () => {
    // The panel and the backend ship separately, so the first deploy of this
    // page will meet a backend with no members route. A rejection here must not
    // take the organisation record down with it.
    listOrganizationMembers.mockRejectedValue(new Error('404 Not Found'));

    await renderPage();

    expect(screen.getByText('Acme Vet')).toBeInTheDocument();
    expect(screen.getByText(/Couldn't load the member list/i)).toBeInTheDocument();
  });

  it('keeps the selected backend environment on the activity link', async () => {
    listOrganizationMembers.mockResolvedValue([]);
    await renderPage('development');
    expect(screen.getByRole('link', { name: 'Activity →' })).toHaveAttribute(
      'href',
      '/organizations/org-1/activity?env=development'
    );
  });
});

describe('generateMetadata', () => {
  it('does not read a private organization before authorization', async () => {
    const { requireSuperAdmin } = jest.requireMock('@/app/config/backend') as {
      requireSuperAdmin: jest.Mock;
    };
    requireSuperAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'org-1' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(getOrganization).not.toHaveBeenCalled();
  });

  it('loads title data through the selected authenticated backend', async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'org-1' }),
        searchParams: Promise.resolve({ env: 'development' }),
      })
    ).resolves.toEqual({ title: 'Acme Vet' });
    expect(getOrganization).toHaveBeenCalledWith('org-1', {
      headers: { cookie: '' },
      baseUrl: 'https://api-dev.example.com',
    });
  });
});
