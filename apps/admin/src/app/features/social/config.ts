import 'server-only';

import { serverEnv } from '@/app/config/env.server';

import { parseKey, SecretKeyError } from './secrets';

/** Credentials for one network, plus the shared key that seals its tokens. */
export interface TikTokConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  tokenKey: Buffer;
}

export interface InstagramConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  tokenKey: Buffer;
}

/** Retained for callers that only need the sealing key. */
export type SocialConfig = TikTokConfig;

const TOKEN_KEY_ENV = 'SOCIAL_TOKEN_KEY';

/** Absent, or present but not a usable 32-byte key. */
function tokenKeyProblem(): string | null {
  if (!serverEnv.socialTokenKey) return TOKEN_KEY_ENV;
  try {
    parseKey(serverEnv.socialTokenKey);
    return null;
  } catch (error) {
    // A malformed key is as unusable as an absent one, but the reason is worth
    // showing: it is the difference between "set this" and "you set it wrong".
    const reason = error instanceof SecretKeyError ? `: ${error.message}` : '';
    return `${TOKEN_KEY_ENV}${reason}`;
  }
}

function collectMissing(required: Array<[string, string | null]>): string[] {
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  const keyProblem = tokenKeyProblem();
  if (keyProblem) missing.push(keyProblem);
  return missing;
}

/** Names of the TikTok env vars that are absent or unusable, in declaration order. */
export function missingTikTokEnv(): string[] {
  return collectMissing([
    ['TIKTOK_CLIENT_KEY', serverEnv.tiktokClientKey],
    ['TIKTOK_CLIENT_SECRET', serverEnv.tiktokClientSecret],
    ['TIKTOK_REDIRECT_URI', serverEnv.tiktokRedirectUri],
  ]);
}

/** Names of the Instagram env vars that are absent or unusable. */
export function missingInstagramEnv(): string[] {
  return collectMissing([
    ['INSTAGRAM_APP_ID', serverEnv.instagramAppId],
    ['INSTAGRAM_APP_SECRET', serverEnv.instagramAppSecret],
    ['INSTAGRAM_REDIRECT_URI', serverEnv.instagramRedirectUri],
  ]);
}

/**
 * The resolved TikTok config, or null when anything is missing. Destructured
 * first so the checks narrow each value to a string - the fields are nullable by
 * design, and re-asserting them later would be a lie the type system could not
 * catch.
 */
export function getTikTokConfig(): TikTokConfig | null {
  const { tiktokClientKey, tiktokClientSecret, tiktokRedirectUri, socialTokenKey } = serverEnv;
  if (!tiktokClientKey || !tiktokClientSecret || !tiktokRedirectUri || !socialTokenKey) {
    return null;
  }
  try {
    return {
      clientKey: tiktokClientKey,
      clientSecret: tiktokClientSecret,
      redirectUri: tiktokRedirectUri,
      tokenKey: parseKey(socialTokenKey),
    };
  } catch {
    return null;
  }
}

export function getInstagramConfig(): InstagramConfig | null {
  const { instagramAppId, instagramAppSecret, instagramRedirectUri, socialTokenKey } = serverEnv;
  if (!instagramAppId || !instagramAppSecret || !instagramRedirectUri || !socialTokenKey) {
    return null;
  }
  try {
    return {
      appId: instagramAppId,
      appSecret: instagramAppSecret,
      redirectUri: instagramRedirectUri,
      tokenKey: parseKey(socialTokenKey),
    };
  } catch {
    return null;
  }
}
