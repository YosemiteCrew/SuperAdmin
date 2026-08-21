/** Name of the cookie carrying the sealed PKCE verifier and OAuth state. */
export const OAUTH_COOKIE = 'sa-tiktok-oauth';

/** Ten minutes: long enough to sign in at TikTok, short enough to be disposable. */
export const OAUTH_COOKIE_MAX_AGE = 600;

export interface OAuthCookiePayload {
  state: string;
  verifier: string;
}

export function parseOAuthCookie(plaintext: string): OAuthCookiePayload | null {
  try {
    const parsed: unknown = JSON.parse(plaintext);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { state, verifier } = parsed as Record<string, unknown>;
    if (typeof state !== 'string' || typeof verifier !== 'string') return null;
    if (!state || !verifier) return null;
    return { state, verifier };
  } catch {
    return null;
  }
}

/** Name of the cookie carrying the sealed Instagram OAuth state. */
export const INSTAGRAM_OAUTH_COOKIE = 'sa-instagram-oauth';

/**
 * Instagram's flow has no PKCE, so the cookie carries only the state value.
 * It is still sealed rather than plain, so a forged cookie cannot fabricate a
 * state that matches an attacker-chosen callback.
 */
export function parseStateCookie(plaintext: string): string | null {
  try {
    const parsed: unknown = JSON.parse(plaintext);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { state } = parsed as Record<string, unknown>;
    return typeof state === 'string' && state ? state : null;
  } catch {
    return null;
  }
}
