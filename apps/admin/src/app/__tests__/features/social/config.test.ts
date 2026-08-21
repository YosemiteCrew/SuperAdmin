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
  },
}));

import { serverEnv } from '@/app/config/env.server';
import { getSocialConfig, missingSocialEnv } from '@/app/features/social/config';

const env = serverEnv as {
  tiktokClientKey: string | null;
  tiktokClientSecret: string | null;
  tiktokRedirectUri: string | null;
  socialTokenKey: string | null;
};

const HEX_KEY = 'a'.repeat(64);

function setEnv(overrides: Partial<typeof env> = {}) {
  Object.assign(env, {
    tiktokClientKey: 'ck',
    tiktokClientSecret: 'cs',
    tiktokRedirectUri: 'https://admin.example.com/api/social/tiktok/callback',
    socialTokenKey: HEX_KEY,
    ...overrides,
  });
}

describe('missingSocialEnv', () => {
  it('reports nothing when everything is present', () => {
    setEnv();
    expect(missingSocialEnv()).toEqual([]);
  });

  it('names each absent variable in declaration order', () => {
    setEnv({ tiktokClientKey: null, tiktokRedirectUri: null });
    expect(missingSocialEnv()).toEqual(['TIKTOK_CLIENT_KEY', 'TIKTOK_REDIRECT_URI']);
  });

  it('reports an absent token key without attempting to parse it', () => {
    setEnv({ socialTokenKey: null });
    expect(missingSocialEnv()).toEqual(['SOCIAL_TOKEN_KEY']);
  });

  it('explains why a malformed token key is unusable', () => {
    setEnv({ socialTokenKey: 'too-short' });
    const missing = missingSocialEnv();
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('SOCIAL_TOKEN_KEY');
    expect(missing[0]).toContain('32 bytes');
  });
});

describe('getSocialConfig', () => {
  it('returns the resolved config with a parsed key', () => {
    setEnv();
    const config = getSocialConfig();
    expect(config?.clientKey).toBe('ck');
    expect(config?.redirectUri).toBe('https://admin.example.com/api/social/tiktok/callback');
    expect(config?.tokenKey).toHaveLength(32);
  });

  it('returns null when anything is missing, rather than throwing', () => {
    setEnv({ tiktokClientSecret: null });
    expect(getSocialConfig()).toBeNull();
  });

  it('returns null for an unusable token key', () => {
    setEnv({ socialTokenKey: 'nope' });
    expect(getSocialConfig()).toBeNull();
  });

  it('returns null when each individual variable is absent', () => {
    for (const key of [
      'tiktokClientKey',
      'tiktokClientSecret',
      'tiktokRedirectUri',
      'socialTokenKey',
    ] as const) {
      setEnv({ [key]: null });
      expect(getSocialConfig()).toBeNull();
    }
  });
});
