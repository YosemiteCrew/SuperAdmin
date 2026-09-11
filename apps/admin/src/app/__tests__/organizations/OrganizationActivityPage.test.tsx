import { render, screen } from '@testing-library/react';

const getOrganization = jest.fn();
const getAuditEventsForTarget = jest.fn();

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
  headers: jest.fn().mockResolvedValue({ get: () => 'session=present' }),
}));
jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  getOrganization: (...args: unknown[]) => getOrganization(...args),
}));
jest.mock('@/app/features/audit/store', () => ({
  getAuditEventsForTarget: (...args: unknown[]) => getAuditEventsForTarget(...args),
}));
jest.mock('@/app/features/audit/AuditTimeline', () => ({
  AuditTimeline: () => <div data-testid="audit-timeline" />,
}));

import OrgActivityPage, {
  generateMetadata,
} from '@/app/(routes)/(dashboard)/organizations/[id]/activity/page';

beforeEach(() => {
  jest.clearAllMocks();
  getOrganization.mockResolvedValue({ id: 'org-1', name: 'Development Vet' });
  getAuditEventsForTarget.mockResolvedValue([]);
});

describe('OrgActivityPage', () => {
  it('loads and links back through the selected backend environment', async () => {
    render(
      await OrgActivityPage({
        params: Promise.resolve({ id: 'org-1' }),
        searchParams: Promise.resolve({ env: 'development' }),
      })
    );

    expect(getOrganization).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        headers: { cookie: 'session=present' },
        baseUrl: 'https://api-dev.example.com',
      })
    );
    expect(screen.getByRole('link', { name: '← Back to Development Vet' })).toHaveAttribute(
      'href',
      '/organizations/org-1?env=development'
    );
  });

  it('loads metadata from the selected backend environment', async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'org-1' }),
        searchParams: Promise.resolve({ env: 'development' }),
      })
    ).resolves.toEqual({ title: 'Development Vet - Activity' });
    expect(getOrganization).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        headers: { cookie: 'session=present' },
        baseUrl: 'https://api-dev.example.com',
      })
    );
  });

  it('does not read a private organization before authorization', async () => {
    const { requireSuperAdmin } = jest.requireMock('@/app/config/backend') as {
      requireSuperAdmin: jest.Mock;
    };
    requireSuperAdmin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    await expect(
      generateMetadata({
        params: Promise.resolve({ id: 'org-1' }),
        searchParams: Promise.resolve({ env: 'development' }),
      })
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(getOrganization).not.toHaveBeenCalled();
  });
});
