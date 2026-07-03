jest.mock('server-only', () => ({}));
jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    plunkApiKey: 'test-key',
    plunkApiEndpoint: 'https://plunk.test',
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  broadcastCampaign,
  isPlunkConfigured,
  sendTransactional,
  syncContacts,
  trackContact,
} from '@/app/features/crm/plunk';

const OK = { success: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(OK),
    text: () => Promise.resolve(''),
  });
});

describe('trackContact', () => {
  it('posts to /v1/track with correct headers', async () => {
    await trackContact({ email: 'a@b.com', subscribed: true });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://plunk.test/v1/track',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.email).toBe('a@b.com');
    expect(body.subscribed).toBe(true);
  });
});

describe('sendTransactional', () => {
  it('posts to /v1/send', async () => {
    await sendTransactional({ to: 'a@b.com', subject: 'Hi', body: 'Hello' });
    expect(mockFetch).toHaveBeenCalledWith('https://plunk.test/v1/send', expect.anything());
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toBe('a@b.com');
    expect(body.subject).toBe('Hi');
  });

  it('uses default from address', async () => {
    await sendTransactional({ to: 'a@b.com', subject: 'Hi', body: 'Hello' });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toBe('team@yosemitecrew.com');
  });
});

describe('syncContacts', () => {
  it('returns synced count', async () => {
    const result = await syncContacts(['a@b.com', 'c@d.com']);
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('counts failed when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const result = await syncContacts(['a@b.com', 'c@d.com']);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('creates contacts unsubscribed by default — sync must never manufacture consent', async () => {
    await syncContacts(['a@b.com']);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subscribed).toBe(false);
  });

  it('passes an explicit subscribed flag through', async () => {
    await syncContacts(['a@b.com'], { subscribed: true });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subscribed).toBe(true);
  });
});

describe('isPlunkConfigured', () => {
  it('reflects the presence of the API key', () => {
    expect(isPlunkConfigured()).toBe(true);
  });
});

describe('broadcastCampaign', () => {
  it('sends to each email and counts results', async () => {
    const result = await broadcastCampaign({
      emails: ['a@b.com', 'c@d.com', 'e@f.com'],
      subject: 'News',
      body: 'Body text',
    });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
  });

  it('counts failed sends', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail'));
    const result = await broadcastCampaign({
      emails: ['a@b.com', 'c@d.com'],
      subject: 'News',
      body: 'Body',
    });
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe('plunkFetch error handling', () => {
  it('throws when API key is missing', async () => {
    jest.resetModules();
    jest.mock('@/app/config/env.server', () => ({
      serverEnv: { plunkApiKey: '', plunkApiEndpoint: 'https://plunk.test' },
    }));
    const { trackContact: tc } = await import('@/app/features/crm/plunk');
    await expect(tc({ email: 'a@b.com', subscribed: true })).rejects.toThrow(
      'PLUNK_API_KEY is not configured'
    );
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: () => Promise.resolve('rate limited'),
    });
    await expect(trackContact({ email: 'a@b.com', subscribed: true })).rejects.toThrow('429');
  });
});
