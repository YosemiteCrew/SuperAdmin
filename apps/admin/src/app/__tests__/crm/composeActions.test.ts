jest.mock('server-only', () => ({}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn(), getUsersOldestFirst: jest.fn() },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getUsersThatHaveRole: jest.fn() },
}));

jest.mock('@/app/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/app/features/crm/plunk', () => ({
  broadcastCampaign: jest.fn(),
}));

jest.mock('@/app/features/crm/campaigns/store', () => ({
  recordCampaign: jest.fn(),
}));

jest.mock('@/app/features/crm/discord/dispatcher', () => ({
  notifyCampaignSent: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';
import { requireSuperAdmin } from '@/app/config/backend';
import { logger } from '@/app/lib/logger';
import { recordCampaign } from '@/app/features/crm/campaigns/store';
import { notifyCampaignSent } from '@/app/features/crm/discord/dispatcher';
import { broadcastCampaign } from '@/app/features/crm/plunk';
import { sendCampaignAction } from '@/app/(routes)/(dashboard)/crm/compose/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockGetUsers = SuperTokens.getUsersOldestFirst as jest.MockedFunction<
  typeof SuperTokens.getUsersOldestFirst
>;
const mockBroadcast = broadcastCampaign as jest.MockedFunction<typeof broadcastCampaign>;
const mockRecord = recordCampaign as jest.MockedFunction<typeof recordCampaign>;
const mockNotify = notifyCampaignSent as jest.MockedFunction<typeof notifyCampaignSent>;
const mockGetRoleUsers = UserRolesNode.getUsersThatHaveRole as jest.MockedFunction<
  typeof UserRolesNode.getUsersThatHaveRole
>;
type RoleResult = Awaited<ReturnType<typeof UserRolesNode.getUsersThatHaveRole>>;

type UsersPage = Awaited<ReturnType<typeof SuperTokens.getUsersOldestFirst>>;
type StUser = Awaited<ReturnType<typeof SuperTokens.getUser>>;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const VALID = { subject: 'Hello world', body: 'A long enough body text.', audience: 'all' };

function usersPage(emails: string[], nextPaginationToken?: string): UsersPage {
  return {
    users: emails.map((e, i) => ({ id: `u${i}`, emails: [e] })),
    nextPaginationToken,
  } as unknown as UsersPage;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockGetUser.mockResolvedValue({ emails: ['admin@yc.com'] } as unknown as StUser);
  mockGetUsers.mockResolvedValue(usersPage(['a@b.com', 'c@d.com']));
  mockBroadcast.mockResolvedValue({ sent: 2, failed: 0 });
  mockRecord.mockResolvedValue({
    id: 'c1',
    subject: 'Hello world',
    preview: '',
    audience: 'all',
    sentCount: 2,
    failedCount: 0,
    sentAt: 1,
    sentBy: 'admin-1',
    sentByEmail: 'admin@yc.com',
  });
  mockNotify.mockResolvedValue(undefined);
  mockGetRoleUsers.mockResolvedValue({ status: 'OK', users: [] } as unknown as RoleResult);
});

describe('sendCampaignAction admins audience', () => {
  /** Two super-admins among a much larger user base of non-admins. */
  function twoAdminsAmongMany() {
    mockGetRoleUsers.mockResolvedValue({
      status: 'OK',
      users: ['admin-1', 'admin-2'],
    } as unknown as RoleResult);
    mockGetUser.mockImplementation((id: string) => {
      const emails: Record<string, string> = {
        'admin-1': 'admin@yc.com',
        'admin-2': 'second@yc.com',
      };
      return Promise.resolve({ emails: [emails[id] ?? `${id}@customer.com`] } as unknown as StUser);
    });
    // The user directory is full of customers who must never receive this.
    mockGetUsers.mockResolvedValue(
      usersPage(['customer1@x.com', 'customer2@x.com', 'customer3@x.com'])
    );
  }

  it('sends only to accounts holding the super-admin role', async () => {
    twoAdminsAmongMany();
    await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));

    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ['admin@yc.com', 'second@yc.com'] })
    );
  });

  it('never sends an admins-only campaign to a non-admin', async () => {
    // The regression guard: the audience used to be the oldest page of ALL
    // users, so selecting "Super-admins only" mailed customers.
    twoAdminsAmongMany();
    await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));

    const { emails } = mockBroadcast.mock.calls[0][0];
    expect(emails).not.toContain('customer1@x.com');
    expect(emails.some((e) => e.endsWith('@customer.com'))).toBe(false);
    expect(emails).toHaveLength(2);
  });

  it('resolves the audience from the role directory, not a user listing', async () => {
    twoAdminsAmongMany();
    await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));

    expect(mockGetRoleUsers).toHaveBeenCalledWith('public', 'superadmin');
    expect(mockGetUsers).not.toHaveBeenCalled();
  });

  it('cancels the send when the role lookup does not return OK', async () => {
    // Fail closed: an unresolvable admin list must not fall back to a wider one.
    twoAdminsAmongMany();
    mockGetRoleUsers.mockResolvedValue({ status: 'UNKNOWN_ROLE_ERROR' } as unknown as RoleResult);

    const result = await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));
    expect(result.error).toMatch(/Failed to fetch/);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('skips role holders whose account has no email', async () => {
    mockGetRoleUsers.mockResolvedValue({
      status: 'OK',
      users: ['admin-1', 'ghost'],
    } as unknown as RoleResult);
    mockGetUser.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'admin-1' ? ({ emails: ['admin@yc.com'] } as unknown as StUser) : undefined
      )
    );

    await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ['admin@yc.com'] })
    );
  });

  it('errors rather than sending when no admin has a usable email', async () => {
    mockGetRoleUsers.mockResolvedValue({ status: 'OK', users: [] } as unknown as RoleResult);
    const result = await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));
    expect(result.error).toMatch(/No recipients/);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});

describe('sendCampaignAction notification failure', () => {
  it('still reports the send but logs when the Discord notice fails', async () => {
    mockNotify.mockRejectedValue(new Error('webhook 500'));
    const result = await sendCampaignAction(fd(VALID));

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(logger.error).toHaveBeenCalledWith(
      'Campaign sent but the Discord notification failed',
      expect.objectContaining({ campaignId: 'c1', error: 'webhook 500' })
    );
  });

  it('identifies the campaign by id and keeps operator-authored text out of the log', async () => {
    // The campaign record already stores the subject, so the id is enough to
    // find it. Logging the subject itself would copy user-provided text into the
    // log for no added reach.
    mockNotify.mockRejectedValue(new Error('webhook 500'));
    await sendCampaignAction(fd({ ...VALID, subject: 'Quarterly update' }));

    const [, context] = (logger.error as jest.Mock).mock.calls[0];
    expect(context).not.toHaveProperty('subject');
    expect(JSON.stringify(context)).not.toContain('Quarterly update');
  });
});

describe('sendCampaignAction validation', () => {
  it('rejects a too-short subject', async () => {
    const result = await sendCampaignAction(fd({ ...VALID, subject: 'ab' }));
    expect(result.error).toMatch(/Subject/);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('rejects a too-short body', async () => {
    const result = await sendCampaignAction(fd({ ...VALID, body: 'short' }));
    expect(result.error).toMatch(/Body/);
  });

  it('rejects an unknown audience', async () => {
    const result = await sendCampaignAction(fd({ ...VALID, audience: 'everyone' }));
    expect(result.error).toMatch(/audience/i);
  });

  it('errors when no recipients are found', async () => {
    mockGetUsers.mockResolvedValue(usersPage([]));
    const result = await sendCampaignAction(fd(VALID));
    expect(result.error).toMatch(/No recipients/);
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('errors cleanly when the recipient fetch throws', async () => {
    mockGetUsers.mockRejectedValue(new Error('core down'));
    const result = await sendCampaignAction(fd(VALID));
    expect(result.error).toMatch(/Failed to fetch/);
  });
});

describe('sendCampaignAction sending', () => {
  it('broadcasts to all recipients and records the campaign', async () => {
    const result = await sendCampaignAction(fd(VALID));

    expect(mockBroadcast).toHaveBeenCalledWith({
      emails: ['a@b.com', 'c@d.com'],
      subject: 'Hello world',
      body: 'A long enough body text.',
    });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Hello world', sentCount: 2, sentBy: 'admin-1' })
    );
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('walks pagination for the all-users audience', async () => {
    mockGetUsers
      .mockResolvedValueOnce(usersPage(['a@b.com'], 'page-2'))
      .mockResolvedValueOnce(usersPage(['c@d.com']));

    await sendCampaignAction(fd(VALID));

    expect(mockGetUsers).toHaveBeenCalledTimes(2);
    expect(mockGetUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ paginationToken: 'page-2' })
    );
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ['a@b.com', 'c@d.com'] })
    );
  });

  it('notifies Discord after sending', async () => {
    await sendCampaignAction(fd(VALID));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Hello world', sentCount: 2 })
    );
  });

  it('still succeeds when the Discord notify fails', async () => {
    mockNotify.mockRejectedValueOnce(new Error('webhook down'));
    const result = await sendCampaignAction(fd(VALID));
    expect(result.error).toBeUndefined();
    expect(result.sent).toBe(2);
  });

  it('reports partial failures from the broadcast', async () => {
    mockBroadcast.mockResolvedValue({ sent: 1, failed: 1 });
    const result = await sendCampaignAction(fd(VALID));
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });
});
