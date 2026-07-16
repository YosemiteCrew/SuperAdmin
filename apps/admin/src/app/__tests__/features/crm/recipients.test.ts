jest.mock('server-only', () => ({}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersOldestFirst: jest.fn(), getUser: jest.fn() },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getUsersThatHaveRole: jest.fn() },
}));

import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { fetchRecipientEmails } from '@/app/features/crm/recipients';

const mockGetUsers = SuperTokens.getUsersOldestFirst as jest.MockedFunction<
  typeof SuperTokens.getUsersOldestFirst
>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockGetRoleUsers = UserRolesNode.getUsersThatHaveRole as jest.MockedFunction<
  typeof UserRolesNode.getUsersThatHaveRole
>;

type UsersPage = Awaited<ReturnType<typeof SuperTokens.getUsersOldestFirst>>;
type StUser = Awaited<ReturnType<typeof SuperTokens.getUser>>;
type RoleResult = Awaited<ReturnType<typeof UserRolesNode.getUsersThatHaveRole>>;

function usersPage(emails: (string | undefined)[], nextPaginationToken?: string): UsersPage {
  return {
    users: emails.map((e, i) => ({ id: `u${i}`, emails: e ? [e] : [] })),
    nextPaginationToken,
  } as unknown as UsersPage;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchRecipientEmails admins audience', () => {
  /** Two super-admins, alongside a user directory full of customers. */
  function twoAdminsAmongMany() {
    mockGetRoleUsers.mockResolvedValue({
      status: 'OK',
      users: ['admin-1', 'admin-2'],
    } as unknown as RoleResult);
    mockGetUser.mockImplementation((id: string) => {
      const known: Record<string, string> = {
        'admin-1': 'admin@yc.com',
        'admin-2': 'second@yc.com',
      };
      return Promise.resolve({ emails: [known[id] ?? `${id}@customer.com`] } as unknown as StUser);
    });
    mockGetUsers.mockResolvedValue(usersPage(['customer1@x.com', 'customer2@x.com']));
  }

  it('resolves from the role directory, never a page of users', async () => {
    // The audience previously read the oldest page of ALL users, so
    // "Super-admins only" reached customers. It must come from the role
    // directory, which is the same source that grants the privilege.
    twoAdminsAmongMany();
    const emails = await fetchRecipientEmails('admins');

    expect(emails).toEqual(['admin@yc.com', 'second@yc.com']);
    expect(mockGetRoleUsers).toHaveBeenCalledWith('public', 'superadmin');
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('never returns a non-admin', async () => {
    twoAdminsAmongMany();
    const emails = await fetchRecipientEmails('admins');
    expect(emails).not.toContain('customer1@x.com');
    expect(emails.some((e) => e.endsWith('@customer.com'))).toBe(false);
  });

  it('throws rather than degrading when the role lookup is not OK', async () => {
    // Fail closed: an unresolvable admin list must cancel the send, not fall
    // back to a wider audience.
    twoAdminsAmongMany();
    mockGetRoleUsers.mockResolvedValue({ status: 'UNKNOWN_ROLE_ERROR' } as unknown as RoleResult);
    await expect(fetchRecipientEmails('admins')).rejects.toThrow(/super-admin role holders/i);
  });

  it('skips a role holder whose account has no email', async () => {
    mockGetRoleUsers.mockResolvedValue({
      status: 'OK',
      users: ['admin-1', 'ghost'],
    } as unknown as RoleResult);
    mockGetUser.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'admin-1' ? ({ emails: ['admin@yc.com'] } as unknown as StUser) : undefined
      )
    );
    expect(await fetchRecipientEmails('admins')).toEqual(['admin@yc.com']);
  });
});

describe('fetchRecipientEmails', () => {
  it('walks every page for the all audience', async () => {
    mockGetUsers
      .mockResolvedValueOnce(usersPage(['a@b.com'], 'p2'))
      .mockResolvedValueOnce(usersPage(['c@d.com'], 'p3'))
      .mockResolvedValueOnce(usersPage(['e@f.com']));

    const emails = await fetchRecipientEmails('all');
    expect(emails).toEqual(['a@b.com', 'c@d.com', 'e@f.com']);
    expect(mockGetUsers).toHaveBeenCalledTimes(3);
    expect(mockGetUsers).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ paginationToken: 'p2' })
    );
  });

  it('skips users with no email address', async () => {
    mockGetUsers.mockResolvedValue(usersPage(['a@b.com', undefined, 'c@d.com']));
    const emails = await fetchRecipientEmails('all');
    expect(emails).toEqual(['a@b.com', 'c@d.com']);
  });
});
