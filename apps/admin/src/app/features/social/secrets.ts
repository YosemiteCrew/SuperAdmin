import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * OAuth tokens are stored in SuperTokens UserMetadata, which keeps them in the
 * SuperTokens core database as plain JSON. Anything with read access to that
 * database would otherwise hold a live posting credential for the company
 * account, so the tokens are sealed with AES-256-GCM before they are written and
 * only ever opened in-process.
 */
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const PREFIX = 'v1';

export class SecretKeyError extends Error {}

/** Accepts a 32-byte key as either 64 hex characters or base64. */
export function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  const isHex = /^[0-9a-fA-F]{64}$/.test(trimmed);
  const key = Buffer.from(trimmed, isHex ? 'hex' : 'base64');
  if (key.length !== KEY_BYTES) {
    throw new SecretKeyError(
      `SOCIAL_TOKEN_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). ` +
        'Generate one with: openssl rand -hex 32'
    );
  }
  return key;
}

export function seal(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const parts = [PREFIX, iv, cipher.getAuthTag(), body];
  return parts.map((part) => (typeof part === 'string' ? part : part.toString('base64'))).join('.');
}

/** Returns null for anything that is not an intact, authentic ciphertext. */
export function open(sealed: string, key: Buffer): string | null {
  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parts[1], 'base64'));
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key, truncated payload or a tampered tag — all indistinguishable to
    // a caller, and all mean "there is no usable secret here".
    return null;
  }
}

/**
 * Compares two secrets without leaking their contents through timing. Length is
 * compared first because timingSafeEqual throws on a mismatch; a length
 * difference is not itself sensitive.
 */
export function constantTimeEquals(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
