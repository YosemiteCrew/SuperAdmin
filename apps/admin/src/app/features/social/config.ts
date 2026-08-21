import 'server-only';

import { serverEnv } from '@/app/config/env.server';

import { parseKey, SecretKeyError } from './secrets';

export interface SocialConfig {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  tokenKey: Buffer;
}

const ENV_NAMES = {
  clientKey: 'TIKTOK_CLIENT_KEY',
  clientSecret: 'TIKTOK_CLIENT_SECRET',
  redirectUri: 'TIKTOK_REDIRECT_URI',
  tokenKey: 'SOCIAL_TOKEN_KEY',
} as const;

/** Names of the env vars that are absent or unusable, in declaration order. */
export function missingSocialEnv(): string[] {
  const missing: string[] = [];
  if (!serverEnv.tiktokClientKey) missing.push(ENV_NAMES.clientKey);
  if (!serverEnv.tiktokClientSecret) missing.push(ENV_NAMES.clientSecret);
  if (!serverEnv.tiktokRedirectUri) missing.push(ENV_NAMES.redirectUri);
  if (!serverEnv.socialTokenKey) {
    missing.push(ENV_NAMES.tokenKey);
    return missing;
  }
  try {
    parseKey(serverEnv.socialTokenKey);
  } catch (error) {
    // A malformed key is as unusable as an absent one, but the reason is worth
    // showing: it is the difference between "set this" and "you set it wrong".
    const reason = error instanceof SecretKeyError ? `: ${error.message}` : '';
    missing.push(`${ENV_NAMES.tokenKey}${reason}`);
  }
  return missing;
}

/**
 * The resolved config, or null when anything required is missing or unusable.
 * Destructured first so the checks narrow each value to a string — the fields
 * are nullable by design, and re-asserting them later would be a lie the type
 * system could not catch.
 */
export function getSocialConfig(): SocialConfig | null {
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
