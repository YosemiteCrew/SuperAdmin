jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
}));

const findManyMock = jest.fn();
const createMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: {
    crmCampaign: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import { getCampaigns, recordCampaign } from '@/app/features/crm/campaigns/store';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ status: 'OK', metadata: {} });
  mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });
  findManyMock.mockResolvedValue([]);
  createMock.mockImplementation(({ data }) => Promise.resolve(data));
});

describe('getCampaigns', () => {
  it('returns empty array when nothing stored', async () => {
    expect(await getCampaigns()).toEqual([]);
  });

  it('returns stored campaigns', async () => {
    const stored = [
      {
        id: 'c1',
        subject: 'Hello',
        preview: 'Hi',
        audience: 'all',
        sentCount: 10,
        failedCount: 0,
        sentAt: 1000,
        sentBy: 'u1',
        sentByEmail: 'a@b.com',
      },
    ];
    mockGet.mockResolvedValue({ status: 'OK', metadata: { campaigns: stored } });
    const result = await getCampaigns();
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Hello');
  });

  it('keeps legacy history visible beside durable campaign rows', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        campaigns: [
          {
            id: 'legacy-1',
            subject: 'Earlier send',
            preview: 'Earlier',
            audience: 'all',
            sentCount: 4,
            failedCount: 0,
            sentAt: 1_000,
            sentBy: 'u1',
            sentByEmail: 'a@b.com',
          },
        ],
      },
    });
    findManyMock.mockResolvedValue([
      {
        id: 'db-1',
        subject: 'Later send',
        preview: 'Later',
        audience: 'admins',
        sentCount: 2,
        failedCount: 0,
        sentAt: new Date(2_000),
        sentBy: 'u2',
        sentByEmail: 'c@d.com',
      },
    ]);

    await expect(getCampaigns()).resolves.toEqual([
      expect.objectContaining({ id: 'db-1', sentAt: 2_000 }),
      expect.objectContaining({ id: 'legacy-1', sentAt: 1_000 }),
    ]);
    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  });

  it('uses the id as a stable tie-breaker across stores', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        campaigns: [
          {
            id: 'campaign-a',
            subject: 'Legacy',
            preview: 'Legacy',
            audience: 'all',
            sentCount: 1,
            failedCount: 0,
            sentAt: 1_000,
            sentBy: 'u1',
            sentByEmail: 'a@b.com',
          },
        ],
      },
    });
    findManyMock.mockResolvedValue([
      {
        id: 'campaign-z',
        subject: 'Durable',
        preview: 'Durable',
        audience: 'all',
        sentCount: 1,
        failedCount: 0,
        sentAt: new Date(1_000),
        sentBy: 'u2',
        sentByEmail: 'c@d.com',
      },
    ]);

    expect((await getCampaigns()).map(({ id }) => id)).toEqual(['campaign-z', 'campaign-a']);
  });

  it('filters malformed entries', async () => {
    mockGet.mockResolvedValue({ status: 'OK', metadata: { campaigns: [{ broken: true }, null] } });
    expect(await getCampaigns()).toHaveLength(0);
  });
});

describe('recordCampaign', () => {
  it('appends each concurrent send without rewriting shared history', async () => {
    const first = {
      subject: 'News',
      preview: 'Hi',
      audience: 'all',
      sentCount: 5,
      failedCount: 0,
      sentAt: 1000,
      sentBy: 'u1',
      sentByEmail: 'a@b.com',
    } as const;

    await Promise.all([
      recordCampaign(first),
      recordCampaign({ ...first, subject: 'Another send', sentAt: 1001 }),
    ]);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenNthCalledWith(1, {
      data: { ...first, id: expect.any(String), sentAt: new Date(1_000) },
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
