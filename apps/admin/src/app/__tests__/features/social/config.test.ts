jest.mock('server-only', () => ({}));

// The factory must own the object: jest hoists jest.mock above the imports, so
// a `const` declared here would still be in its temporal dead zone when
// config.ts reads it at module-init time.
jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    tiktokClientKey: null,
    tiktokClientSecret: null,
    tiktokRedirectUri: null,
    socialTokenKey: null,
    instagramAppId: null,
    instagramAppSecret: null,
    instagramRedirectUri: null,
  },
}));

import { serverEnv } from '@/app/config/env.server';
import {
  getInstagramConfig,
  getTikTokConfig,
  missingInstagramEnv,
  missingTikTokEnv,
} from '@/app/features/social/config';

const env = serverEnv as {
  tiktokClientKey: string | null;
  tiktokClientSecret: string | null;
  tiktokRedirectUri: string | null;
  socialTokenKey: string | null;
  instagramAppId: string | null;
  instagramAppSecret: string | null;
  instagramRedirectUri: string | null;
};

const HEX_KEY = 'a'.repeat(64);

function setEnv(overrides: Partial<typeof env> = {}) {
  Object.assign(env, {
    tiktokClientKey: 'ck',
    tiktokClientSecret: 'cs',
    tiktokRedirectUri: 'https://admin.example.com/api/social/tiktok/callback',
    socialTokenKey: HEX_KEY,
    instagramAppId: 'ig-app',
    instagramAppSecret: 'ig-secret',
    instagramRedirectUri: 'https://admin.example.com/api/social/instagram/callback',
    ...overrides,
  });
}

describe('missingTikTokEnv', () => {
  it('reports nothing when everything is present', () => {
    setEnv();
    expect(missingTikTokEnv()).toEqual([]);
  });

  it('names each absent variable in declaration order', () => {
    setEnv({ tiktokClientKey: null, tiktokRedirectUri: null });
    expect(missingTikTokEnv()).toEqual(['TIKTOK_CLIENT_KEY', 'TIKTOK_REDIRECT_URI']);
  });

  it('reports an absent token key without attempting to parse it', () => {
    setEnv({ socialTokenKey: null });
    expect(missingTikTokEnv()).toEqual(['SOCIAL_TOKEN_KEY']);
  });

  it('explains why a malformed token key is unusable', () => {
    setEnv({ socialTokenKey: 'too-short' });
    const missing = missingTikTokEnv();
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('SOCIAL_TOKEN_KEY');
    expect(missing[0]).toContain('32 bytes');
  });
});

describe('getTikTokConfig', () => {
  it('returns the resolved config with a parsed key', () => {
    setEnv();
    const config = getTikTokConfig();
    expect(config?.clientKey).toBe('ck');
    expect(config?.redirectUri).toBe('https://admin.example.com/api/social/tiktok/callback');
    expect(config?.tokenKey).toHaveLength(32);
  });

  it('returns null when anything is missing, rather than throwing', () => {
    setEnv({ tiktokClientSecret: null });
    expect(getTikTokConfig()).toBeNull();
  });

  it('returns null for an unusable token key', () => {
    setEnv({ socialTokenKey: 'nope' });
    expect(getTikTokConfig()).toBeNull();
  });

  it('returns null when each individual variable is absent', () => {
    for (const key of [
      'tiktokClientKey',
      'tiktokClientSecret',
      'tiktokRedirectUri',
      'socialTokenKey',
    ] as const) {
      setEnv({ [key]: null });
      expect(getTikTokConfig()).toBeNull();
    }
  });
});

describe('Instagram config', () => {
  it('resolves when every Instagram variable is present', () => {
    setEnv();
    expect(missingInstagramEnv()).toEqual([]);
    expect(getInstagramConfig()?.appId).toBe('ig-app');
  });

  it('names each absent Instagram variable', () => {
    setEnv({ instagramAppSecret: null, instagramRedirectUri: null });
    expect(missingInstagramEnv()).toEqual(['INSTAGRAM_APP_SECRET', 'INSTAGRAM_REDIRECT_URI']);
    expect(getInstagramConfig()).toBeNull();
  });

  it('reports the shared token key against both networks', () => {
    setEnv({ socialTokenKey: null });
    expect(missingTikTokEnv()).toContain('SOCIAL_TOKEN_KEY');
    expect(missingInstagramEnv()).toContain('SOCIAL_TOKEN_KEY');
  });

  it('returns null for an unusable shared token key', () => {
    setEnv({ socialTokenKey: 'nope' });
    expect(getInstagramConfig()).toBeNull();
  });

  it('is independent of the TikTok credentials', () => {
    setEnv({ tiktokClientKey: null });
    expect(missingInstagramEnv()).toEqual([]);
    expect(getInstagramConfig()).not.toBeNull();
  });
});
