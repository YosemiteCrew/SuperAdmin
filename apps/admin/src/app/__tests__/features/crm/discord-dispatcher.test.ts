jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import {
  notifyCampaignSent,
  sendDiscordEmbed,
  sendDiscordMessage,
} from '@/app/features/crm/discord/dispatcher';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;

const WEBHOOK = 'https://discord.com/api/webhooks/123/abc';

function withWebhook(notifyOnEvents = true) {
  mockGet.mockResolvedValue({
    status: 'OK',
    metadata: {
      config: { webhookUrl: WEBHOOK, channelName: '#ops', notifyOnEvents },
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ status: 'OK', metadata: {} });
  mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('') });
});

describe('sendDiscordMessage', () => {
  it('posts content to the webhook URL', async () => {
    withWebhook();
    await sendDiscordMessage('Hello Discord');
    expect(mockFetch).toHaveBeenCalledWith(WEBHOOK, expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.content).toBe('Hello Discord');
  });

  it('throws when webhook URL is not configured', async () => {
    await expect(sendDiscordMessage('test')).rejects.toThrow('not configured');
  });

  it('throws when webhook returns non-ok status', async () => {
    withWebhook();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('bad payload'),
    });
    await expect(sendDiscordMessage('test')).rejects.toThrow('400');
  });
});

describe('sendDiscordEmbed', () => {
  it('posts embeds array to webhook', async () => {
    withWebhook();
    await sendDiscordEmbed({ title: 'Test', color: 0x10b981 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.embeds[0].title).toBe('Test');
  });

  it('throws when webhook URL is not configured', async () => {
    await expect(sendDiscordEmbed({ title: 'test' })).rejects.toThrow('not configured');
  });
});

describe('notifyCampaignSent', () => {
  it('sends an embed with campaign details when notifyOnEvents is true', async () => {
    withWebhook(true);
    await notifyCampaignSent({ subject: 'Newsletter', sentCount: 42, sentByEmail: 'a@b.com' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.embeds[0].title).toBe('Campaign sent');
    expect(body.embeds[0].fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Newsletter' })])
    );
  });

  it('skips sending when notifyOnEvents is false', async () => {
    withWebhook(false);
    await notifyCampaignSent({ subject: 'Newsletter', sentCount: 5, sentByEmail: 'a@b.com' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('skips sending when webhook URL is empty', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: { config: { webhookUrl: '', channelName: '', notifyOnEvents: true } },
    });
    await notifyCampaignSent({ subject: 'Test', sentCount: 1, sentByEmail: 'a@b.com' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
