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
