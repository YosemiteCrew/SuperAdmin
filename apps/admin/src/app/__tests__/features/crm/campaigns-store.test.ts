jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
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

  it('filters malformed entries', async () => {
    mockGet.mockResolvedValue({ status: 'OK', metadata: { campaigns: [{ broken: true }, null] } });
    expect(await getCampaigns()).toHaveLength(0);
  });
});

describe('recordCampaign', () => {
  it('generates an id and prepends to the list', async () => {
    const campaign = await recordCampaign({
      subject: 'News',
      preview: 'Hi',
      audience: 'all',
      sentCount: 5,
      failedCount: 0,
      sentAt: 1000,
      sentBy: 'u1',
      sentByEmail: 'a@b.com',
    });

    expect(typeof campaign.id).toBe('string');
    expect(campaign.subject).toBe('News');

    const [, payload] = mockUpdate.mock.calls[0];
    const saved = (payload as Record<string, unknown>).campaigns as unknown[];
    expect(saved[0]).toMatchObject({ subject: 'News' });
  });
});
