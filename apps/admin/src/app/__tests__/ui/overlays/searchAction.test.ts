jest.mock('server-only', () => ({}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersNewestFirst: jest.fn() },
}));

jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  listOrganizations: jest.fn(),
}));

import supertokens from 'supertokens-node';
import { requireSuperAdmin } from '@/app/config/backend';
import { listOrganizations } from '@/app/features/organizations/services/organizationsService';
import { searchDirectoryAction } from '@/app/ui/overlays/CommandPalette/searchAction';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetUsers = supertokens.getUsersNewestFirst as jest.MockedFunction<
  typeof supertokens.getUsersNewestFirst
>;
const mockListOrgs = listOrganizations as jest.MockedFunction<typeof listOrganizations>;

type UsersPage = Awaited<ReturnType<typeof supertokens.getUsersNewestFirst>>;
type Orgs = Awaited<ReturnType<typeof listOrganizations>>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockGetUsers.mockResolvedValue({
    users: [{ id: 'u1', emails: ['pet@owner.com'] }],
  } as unknown as UsersPage);
  mockListOrgs.mockResolvedValue([
    { id: 'o1', name: 'Happy Paws Clinic' },
    { id: 'o2', name: 'City Vets' },
  ] as unknown as Orgs);
});

describe('searchDirectoryAction', () => {
  it('always enforces the super-admin gate', async () => {
    await searchDirectoryAction('pet');
    expect(mockRequireSuperAdmin).toHaveBeenCalled();
  });

  it('returns nothing for queries under the minimum length', async () => {
    expect(await searchDirectoryAction('a')).toEqual([]);
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('returns nothing for a non-string payload', async () => {
    expect(await searchDirectoryAction(42 as unknown as string)).toEqual([]);
  });

  it('searches users by email and orgs by name', async () => {
    const hits = await searchDirectoryAction('paws');

    expect(mockGetUsers).toHaveBeenCalledWith(
      expect.objectContaining({ query: { email: 'paws' }, limit: 5 })
    );
    expect(hits).toEqual([
      { id: 'u1', kind: 'user', title: 'pet@owner.com', href: '/users/u1' },
      { id: 'o1', kind: 'organization', title: 'Happy Paws Clinic', href: '/organizations/o1' },
    ]);
  });

  it('org matching is case-insensitive', async () => {
    const hits = await searchDirectoryAction('CITY');
    expect(hits.some((h) => h.title === 'City Vets')).toBe(true);
  });

  it('user hits still return when the businesses backend is down', async () => {
    mockListOrgs.mockRejectedValue(new Error('backend unreachable'));
    const hits = await searchDirectoryAction('pet');
    expect(hits).toEqual([{ id: 'u1', kind: 'user', title: 'pet@owner.com', href: '/users/u1' }]);
  });

  it('org hits still return when the user search fails', async () => {
    mockGetUsers.mockRejectedValue(new Error('core down'));
    const hits = await searchDirectoryAction('paws');
    expect(hits).toEqual([
      { id: 'o1', kind: 'organization', title: 'Happy Paws Clinic', href: '/organizations/o1' },
    ]);
  });

  it('truncates oversized queries instead of forwarding them', async () => {
    await searchDirectoryAction(`${'a'.repeat(200)}@x.com`);
    const arg = mockGetUsers.mock.calls[0][0] as { query?: { email: string } };
    expect(arg.query?.email.length).toBeLessThanOrEqual(100);
  });

  it('skips users without an email address', async () => {
    mockGetUsers.mockResolvedValue({
      users: [{ id: 'u2', emails: [] }],
    } as unknown as UsersPage);
    mockListOrgs.mockResolvedValue([] as unknown as Orgs);
    expect(await searchDirectoryAction('ghost')).toEqual([]);
  });
});
