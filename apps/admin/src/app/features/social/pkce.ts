import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

import { constantTimeEquals } from './secrets';

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/**
 * TikTok requires PKCE on the web flow, but documents the challenge as a
 * *hex*-encoded SHA-256 of the verifier rather than the base64url form RFC 7636
 * specifies. Sending base64url is rejected, so the hex digest is deliberate.
 */
export function createPkcePair(): PkcePair {
  const verifier = randomBytes(48).toString('hex');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('hex') };
}

export function createOAuthState(): string {
  return randomBytes(16).toString('hex');
}

/** Constant-time compare so the returned state can't be probed byte-by-byte. */
export function statesMatch(expected: string, received: string): boolean {
  return constantTimeEquals(expected, received);
}
