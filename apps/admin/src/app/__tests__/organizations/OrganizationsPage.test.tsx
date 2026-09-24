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

const listOrganizationsMock = jest.fn();
jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  listOrganizations: (...args: unknown[]) => listOrganizationsMock(...args),
}));
jest.mock('@/app/(routes)/(dashboard)/organizations/OrganizationAvatar', () => ({
  OrganizationAvatar: () => null,
}));
jest.mock('@/app/(routes)/(dashboard)/organizations/OrganizationRowActions', () => ({
  OrganizationRowActions: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  listOrganizationsMock.mockResolvedValue([]);
});

describe('OrganizationsPage', () => {
  it('rejects repeated query parameters and loads the safe default view', async () => {
    const mod = await import('@/app/(routes)/(dashboard)/organizations/page');

    await mod.default({
      searchParams: Promise.resolve({
        status: ['verified', 'suspended'],
        search: ['first', 'second'],
        demo: ['1', '0'],
        env: ['development', 'production'],
      }),
    });

    expect(listOrganizationsMock).toHaveBeenCalledWith({
      headers: { cookie: 'session=present' },
      baseUrl: 'https://api.example.com',
    });
  });
});
