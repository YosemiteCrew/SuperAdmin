jest.mock('server-only', () => ({}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersOldestFirst: jest.fn() },
}));

import SuperTokens from 'supertokens-node';

import { fetchRecipientEmails } from '@/app/features/crm/recipients';

const mockGetUsers = SuperTokens.getUsersOldestFirst as jest.MockedFunction<
  typeof SuperTokens.getUsersOldestFirst
>;

type UsersPage = Awaited<ReturnType<typeof SuperTokens.getUsersOldestFirst>>;

function usersPage(emails: (string | undefined)[], nextPaginationToken?: string): UsersPage {
  return {
    users: emails.map((e, i) => ({ id: `u${i}`, emails: e ? [e] : [] })),
    nextPaginationToken,
  } as unknown as UsersPage;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchRecipientEmails', () => {
  it('reads a single page for the admins audience', async () => {
    mockGetUsers.mockResolvedValue(usersPage(['a@b.com', 'c@d.com']));
    const emails = await fetchRecipientEmails('admins');
    expect(emails).toEqual(['a@b.com', 'c@d.com']);
    expect(mockGetUsers).toHaveBeenCalledTimes(1);
  });

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
