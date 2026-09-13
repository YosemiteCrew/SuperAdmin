jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/features/crm/discord/dispatcher', () => ({
  sendDiscordMessage: jest.fn(),
}));

jest.mock('@/app/features/crm/discord/store', () => ({
  saveDiscordConfig: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { sendDiscordMessage } from '@/app/features/crm/discord/dispatcher';
import { saveDiscordConfig } from '@/app/features/crm/discord/store';
import {
  broadcastDiscordAction,
  saveDiscordConfigAction,
  testDiscordWebhookAction,
} from '@/app/(routes)/(dashboard)/crm/discord/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockSend = sendDiscordMessage as jest.MockedFunction<typeof sendDiscordMessage>;
const mockSave = saveDiscordConfig as jest.MockedFunction<typeof saveDiscordConfig>;

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const WEBHOOK = 'https://discord.com/api/webhooks/1/x';

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: 'admin-1' });
  mockSend.mockResolvedValue(undefined);
  mockSave.mockResolvedValue(undefined);
});

describe('saveDiscordConfigAction', () => {
  it.each([
    'http://discord.com/api/webhooks/1/x',
    'https://example.com/api/webhooks/1/x',
    'https://discord.com.example/api/webhooks/1/x',
    'https://discord.com:8443/api/webhooks/1/x',
    ['https://', 'name', ':', 'word', '@discord.com/api/webhooks/1/x'].join(''),
    'https://discord.com/api/webhooks/1/x?wait=true',
    'https://discord.com/api/webhooks/1/x#fragment',
    'https://discord.com/not-webhooks/1/x',
  ])('rejects a destination outside the Discord webhook contract: %s', async (webhookUrl) => {
    const result = await saveDiscordConfigAction(fd({ webhookUrl }));
    expect(result.error).toMatch(/valid Discord webhook/i);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('accepts an empty webhook URL (clearing the config)', async () => {
    const result = await saveDiscordConfigAction(fd({ webhookUrl: '', channelName: '' }));
    expect(result.success).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ webhookUrl: '', notifyOnEvents: false })
    );
  });

  it('saves a valid config with notifyOnEvents from the checkbox', async () => {
    const result = await saveDiscordConfigAction(
      fd({ webhookUrl: WEBHOOK, channelName: '#ops', notifyOnEvents: 'on' })
    );
    expect(result.success).toBe(true);
    expect(mockSave).toHaveBeenCalledWith({
      webhookUrl: WEBHOOK,
      channelName: '#ops',
      notifyOnEvents: true,
    });
  });

  it('accepts the legacy Discord webhook host', async () => {
    const webhookUrl = 'https://discordapp.com/api/webhooks/123/token_value-1';
    const result = await saveDiscordConfigAction(fd({ webhookUrl, channelName: '#ops' }));
    expect(result.success).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ webhookUrl }));
  });
});

describe('testDiscordWebhookAction', () => {
  it('refuses without a saved valid URL', async () => {
    const result = await testDiscordWebhookAction(fd({ webhookUrl: '' }));
    expect(result.error).toMatch(/valid webhook/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends a test message for a valid URL', async () => {
    const result = await testDiscordWebhookAction(fd({ webhookUrl: WEBHOOK }));
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(expect.stringMatching(/Test message/));
  });

  it('refuses to test an arbitrary HTTPS destination', async () => {
    const result = await testDiscordWebhookAction(
      fd({ webhookUrl: 'https://internal.example/api/webhooks/1/x' })
    );
    expect(result.error).toMatch(/valid webhook/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('surfaces the dispatcher error message on failure', async () => {
    mockSend.mockRejectedValueOnce(new Error('Discord webhook failed (404)'));
    const result = await testDiscordWebhookAction(fd({ webhookUrl: WEBHOOK }));
    expect(result.error).toMatch(/404/);
  });
});

describe('broadcastDiscordAction', () => {
  it('rejects an empty message', async () => {
    const result = await broadcastDiscordAction(fd({ message: ' ' }));
    expect(result.error).toMatch(/empty/i);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends a trimmed message', async () => {
    const result = await broadcastDiscordAction(fd({ message: '  Hello team  ' }));
    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith('Hello team');
  });

  it('surfaces send failures as an error result', async () => {
    mockSend.mockRejectedValueOnce(new Error('not configured'));
    const result = await broadcastDiscordAction(fd({ message: 'Hello' }));
    expect(result.error).toMatch(/not configured/);
  });
});
