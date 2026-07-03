jest.mock('server-only', () => ({}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn(), getUsersOldestFirst: jest.fn() },
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
import { requireSuperAdmin } from '@/app/config/backend';
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

  it('fetches a single page for the admins audience', async () => {
    await sendCampaignAction(fd({ ...VALID, audience: 'admins' }));
    expect(mockGetUsers).toHaveBeenCalledTimes(1);
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
