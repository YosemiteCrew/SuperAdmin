jest.mock('server-only', () => ({}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(), updateUserMetadata: jest.fn() },
}));
jest.mock('@/app/config/backend', () => ({ ensureSuperTokensInit: jest.fn() }));

const refreshMock = jest.fn();
jest.mock('@/app/features/social/tiktok', () => ({
  refreshAccessToken: (...args: unknown[]) => refreshMock(...args),
}));

const refreshLongLivedMock = jest.fn();
jest.mock('@/app/features/social/instagram', () => ({
  refreshLongLived: (...args: unknown[]) => refreshLongLivedMock(...args),
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import type { InstagramConfig, TikTokConfig } from '@/app/features/social/config';
import { parseKey, seal } from '@/app/features/social/secrets';
import {
  clearConnection,
  clearInstagramConnection,
  getUsableConnection,
  getUsableInstagramConnection,
  readConnection,
  readInstagramConnection,
  toInstagramSummary,
  toSummary,
  writeConnection,
  writeInstagramConnection,
} from '@/app/features/social/store';
import type { InstagramConnection, TikTokConnection } from '@/app/features/social/types';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

const CONFIG: TikTokConfig = {
  clientKey: 'ck',
  clientSecret: 'cs',
  redirectUri: 'https://admin/cb',
  tokenKey: parseKey('a'.repeat(64)),
};

const NOW = 1_700_000_000_000;

function connection(overrides: Partial<TikTokConnection> = {}): TikTokConnection {
  return {
    openId: 'oid',
    displayName: 'yosemite_crew',
    scope: 'video.publish',
    accessToken: 'at',
    refreshToken: 'rt',
    expiresAt: NOW + 86_400_000,
    refreshExpiresAt: NOW + 31_536_000_000,
    connectedAt: NOW,
    connectedByEmail: 'admin@example.com',
    ...overrides,
  };
}

function storedAs(value: TikTokConnection) {
  mockGet.mockResolvedValue({
    status: 'OK' as const,
    metadata: { tiktok: seal(JSON.stringify(value), CONFIG.tokenKey) },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ status: 'OK' as const, metadata: {} });
  mockUpdate.mockResolvedValue({ status: 'OK' as const, metadata: {} });
});

describe('readConnection', () => {
  it('returns null when nothing is stored', async () => {
    expect(await readConnection(CONFIG)).toBeNull();
  });

  it('unseals a stored connection', async () => {
    storedAs(connection());
    expect(await readConnection(CONFIG)).toEqual(connection());
  });

  it('returns null when the key no longer opens the blob', async () => {
    storedAs(connection());
    const rotated = { ...CONFIG, tokenKey: parseKey('b'.repeat(64)) };
    expect(await readConnection(rotated)).toBeNull();
  });

  it('returns null for a structurally invalid payload', async () => {
    mockGet.mockResolvedValue({
      status: 'OK' as const,
      metadata: { tiktok: seal(JSON.stringify({ openId: 1 }), CONFIG.tokenKey) },
    });
    expect(await readConnection(CONFIG)).toBeNull();
  });

  it('returns null for a null or non-object payload', async () => {
    mockGet.mockResolvedValue({
      status: 'OK' as const,
      metadata: { tiktok: seal('null', CONFIG.tokenKey) },
    });
    expect(await readConnection(CONFIG)).toBeNull();
  });

  it('ignores a non-string stored value', async () => {
    mockGet.mockResolvedValue({ status: 'OK' as const, metadata: { tiktok: 42 } });
    expect(await readConnection(CONFIG)).toBeNull();
  });

  it('returns null rather than throwing when the metadata read fails', async () => {
    mockGet.mockRejectedValue(new Error('core down'));
    expect(await readConnection(CONFIG)).toBeNull();
  });
});

describe('writeConnection / clearConnection', () => {
  it('stores the connection sealed, never as readable JSON', async () => {
    await writeConnection(CONFIG, connection());
    const written = mockUpdate.mock.calls[0][1] as Record<string, string>;
    expect(written.tiktok).toMatch(/^v1\./);
    // The field names themselves must not survive: if the blob were readable
    // JSON this would match. (Asserting on the token value alone is unsafe —
    // a short string appears in base64 by chance.)
    expect(written.tiktok).not.toContain('accessToken');
    expect(written.tiktok).not.toContain('refreshToken');
    expect(mockUpdate.mock.calls[0][0]).toBe('superadmin:social-poster');
  });

  it('clears by writing null to just that key', async () => {
    await clearConnection();
    expect(mockUpdate).toHaveBeenCalledWith('superadmin:social-poster', { tiktok: null });
  });
});

describe('toSummary', () => {
  it('drops both tokens', () => {
    const summary = toSummary(connection()) as Record<string, unknown>;
    expect(summary.accessToken).toBeUndefined();
    expect(summary.refreshToken).toBeUndefined();
    expect(summary.displayName).toBe('yosemite_crew');
    expect(summary.connectedByEmail).toBe('admin@example.com');
  });
});

describe('getUsableConnection', () => {
  it('returns a token that is still comfortably valid without refreshing', async () => {
    storedAs(connection());
    const result = await getUsableConnection(CONFIG, NOW);
    expect(result?.accessToken).toBe('at');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('returns null when there is no connection', async () => {
    expect(await getUsableConnection(CONFIG, NOW)).toBeNull();
  });

  it('refreshes and persists when the access token is close to expiry', async () => {
    storedAs(connection({ expiresAt: NOW + 60_000 }));
    refreshMock.mockResolvedValue({
      accessToken: 'at2',
      refreshToken: 'rt2',
      expiresIn: 86_400,
      refreshExpiresIn: 31_536_000,
      scope: 'video.publish',
      openId: 'oid',
    });
    const result = await getUsableConnection(CONFIG, NOW);
    expect(result?.accessToken).toBe('at2');
    // TikTok rotates the refresh token; keeping the old one would strand us.
    expect(result?.refreshToken).toBe('rt2');
    expect(result?.expiresAt).toBe(NOW + 86_400_000);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('keeps the existing refresh token when the response omits one', async () => {
    storedAs(connection({ expiresAt: NOW + 60_000 }));
    refreshMock.mockResolvedValue({
      accessToken: 'at2',
      refreshToken: '',
      expiresIn: 100,
      refreshExpiresIn: 200,
      scope: '',
      openId: '',
    });
    const result = await getUsableConnection(CONFIG, NOW);
    expect(result?.refreshToken).toBe('rt');
    expect(result?.scope).toBe('video.publish');
  });

  it('returns null when the refresh token itself has expired', async () => {
    storedAs(connection({ expiresAt: NOW - 1, refreshExpiresAt: NOW - 1 }));
    expect(await getUsableConnection(CONFIG, NOW)).toBeNull();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('adopts a new scope when the refresh returns one', async () => {
    storedAs(connection({ expiresAt: NOW + 60_000 }));
    refreshMock.mockResolvedValue({
      accessToken: 'at2',
      refreshToken: 'rt2',
      expiresIn: 100,
      refreshExpiresIn: 200,
      scope: 'video.publish,video.upload',
      openId: 'oid',
    });
    expect((await getUsableConnection(CONFIG, NOW))?.scope).toBe('video.publish,video.upload');
  });

  it('returns null when the refresh call fails', async () => {
    storedAs(connection({ expiresAt: NOW + 60_000 }));
    refreshMock.mockRejectedValue(new Error('revoked'));
    expect(await getUsableConnection(CONFIG, NOW)).toBeNull();
  });
});

const DAY = 24 * 60 * 60 * 1000;

/** Same sealing key, Instagram-shaped credentials. */
const IG_CONFIG: InstagramConfig = {
  appId: 'ig-app',
  appSecret: 'ig-secret',
  redirectUri: 'https://admin/ig-cb',
  tokenKey: CONFIG.tokenKey,
};

function igConnection(overrides: Partial<InstagramConnection> = {}): InstagramConnection {
  return {
    userId: '178414',
    username: 'yosemite_crew',
    accessToken: 'ig-token',
    expiresAt: NOW + 60 * DAY,
    connectedAt: NOW,
    connectedByEmail: 'admin@example.com',
    ...overrides,
  };
}

function igStoredAs(value: InstagramConnection) {
  mockGet.mockResolvedValue({
    status: 'OK' as const,
    metadata: { instagram: seal(JSON.stringify(value), CONFIG.tokenKey) },
  });
}

describe('Instagram connection storage', () => {
  it('writes under its own key, so it cannot clobber the TikTok connection', async () => {
    await writeInstagramConnection(IG_CONFIG, igConnection());
    const [storeId, written] = mockUpdate.mock.calls[0] as [string, Record<string, string>];
    expect(storeId).toBe('superadmin:social-poster');
    expect(Object.keys(written)).toEqual(['instagram']);
    expect(written.instagram).toMatch(/^v1\./);
    expect(written.instagram).not.toContain('accessToken');
  });

  it('clears only its own key', async () => {
    await clearInstagramConnection();
    expect(mockUpdate).toHaveBeenCalledWith('superadmin:social-poster', { instagram: null });
  });

  it('round-trips a stored connection', async () => {
    igStoredAs(igConnection());
    expect(await readInstagramConnection(IG_CONFIG)).toEqual(igConnection());
  });

  it('returns null for absent, unreadable, malformed or non-string values', async () => {
    expect(await readInstagramConnection(IG_CONFIG)).toBeNull();

    igStoredAs(igConnection());
    expect(
      await readInstagramConnection({ ...IG_CONFIG, tokenKey: parseKey('b'.repeat(64)) })
    ).toBeNull();

    mockGet.mockResolvedValue({
      status: 'OK' as const,
      metadata: { instagram: seal(JSON.stringify({ userId: 5 }), CONFIG.tokenKey) },
    });
    expect(await readInstagramConnection(IG_CONFIG)).toBeNull();

    mockGet.mockResolvedValue({ status: 'OK' as const, metadata: { instagram: 42 } });
    expect(await readInstagramConnection(IG_CONFIG)).toBeNull();
  });

  it('returns null rather than throwing when the metadata read fails', async () => {
    mockGet.mockRejectedValue(new Error('core down'));
    expect(await readInstagramConnection(IG_CONFIG)).toBeNull();
  });

  it('drops the token from the summary', () => {
    const summary = toInstagramSummary(igConnection()) as Record<string, unknown>;
    expect(summary.accessToken).toBeUndefined();
    expect(summary.username).toBe('yosemite_crew');
  });
});

describe('getUsableInstagramConnection', () => {
  it('returns a token that is still far from expiry without refreshing', async () => {
    igStoredAs(igConnection());
    expect((await getUsableInstagramConnection(IG_CONFIG, NOW))?.accessToken).toBe('ig-token');
    expect(refreshLongLivedMock).not.toHaveBeenCalled();
  });

  it('returns null when there is no connection', async () => {
    expect(await getUsableInstagramConnection(IG_CONFIG, NOW)).toBeNull();
  });

  it('renews and persists inside the one-week margin', async () => {
    igStoredAs(igConnection({ expiresAt: NOW + 2 * DAY }));
    refreshLongLivedMock.mockResolvedValue({ accessToken: 'renewed', expiresIn: 60 * 24 * 3600 });
    const result = await getUsableInstagramConnection(IG_CONFIG, NOW);
    expect(result?.accessToken).toBe('renewed');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('keeps the old token when the renewal response omits one', async () => {
    igStoredAs(igConnection({ expiresAt: NOW + 2 * DAY }));
    refreshLongLivedMock.mockResolvedValue({ accessToken: '', expiresIn: 100 });
    expect((await getUsableInstagramConnection(IG_CONFIG, NOW))?.accessToken).toBe('ig-token');
  });

  it('returns null once the token has actually lapsed, since nothing can renew it', async () => {
    igStoredAs(igConnection({ expiresAt: NOW - 1 }));
    expect(await getUsableInstagramConnection(IG_CONFIG, NOW)).toBeNull();
    expect(refreshLongLivedMock).not.toHaveBeenCalled();
  });

  it('keeps using the still-valid token when renewal fails', async () => {
    igStoredAs(igConnection({ expiresAt: NOW + 2 * DAY }));
    refreshLongLivedMock.mockRejectedValue(new Error('rate limited'));
    // The old token has days left, so today's post should still go out.
    expect((await getUsableInstagramConnection(IG_CONFIG, NOW))?.accessToken).toBe('ig-token');
  });
});
