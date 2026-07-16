jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import { getDiscordConfig, saveDiscordConfig } from '@/app/features/crm/discord/store';

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

describe('getDiscordConfig', () => {
  it('returns default config when nothing stored', async () => {
    const config = await getDiscordConfig();
    expect(config.webhookUrl).toBe('');
    expect(config.notifyOnEvents).toBe(false);
  });

  it('returns stored config', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        config: {
          webhookUrl: 'https://discord.com/webhook',
          channelName: '#general',
          notifyOnEvents: true,
        },
      },
    });
    const config = await getDiscordConfig();
    expect(config.webhookUrl).toBe('https://discord.com/webhook');
    expect(config.notifyOnEvents).toBe(true);
  });
});

describe('saveDiscordConfig', () => {
  it('writes config to metadata', async () => {
    await saveDiscordConfig({
      webhookUrl: 'https://discord.com/wh',
      channelName: '#ops',
      notifyOnEvents: true,
    });
    const [, payload] = mockUpdate.mock.calls[0];
    const saved = (payload as Record<string, unknown>).config as Record<string, unknown>;
    expect(saved.webhookUrl).toBe('https://discord.com/wh');
    expect(saved.notifyOnEvents).toBe(true);
  });
});
