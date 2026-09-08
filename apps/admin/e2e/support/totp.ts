import { createHmac } from 'node:crypto';

/**
 * RFC 6238 TOTP.
 *
 * Every super admin is required to hold a TOTP device, so an authenticated spec
 * cannot reach the dashboard on an email and password alone. Implemented here in
 * a dozen lines rather than pulled from a dependency: this is a public repo, and
 * a new package in the tree to avoid one HMAC is a worse trade than the code.
 *
 * The shared secret comes from the environment. It is a credential - never log
 * it, never write it into a fixture, never commit it.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decodes an RFC 4648 base32 secret, the form authenticator apps hand out. */
export const decodeBase32 = (input: string): Buffer => {
  // Whitespace first, THEN padding. The other order fails on a trailing space:
  // `=+$` no longer matches the end, the `=` survives into the loop and throws.
  // The setup screen shows the key in spaced groups, so this is the ordinary
  // copy-paste case, not an exotic one.
  const clean = input.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('TOTP secret is not valid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
};

export type TotpOptions = {
  /** Seconds per step. 30 everywhere in practice. */
  step?: number;
  digits?: number;
  /** Unix seconds. Injectable so the RFC vectors can be asserted. */
  now?: number;
};

/**
 * `secret` is the base32 string an authenticator hands out, or the raw key bytes.
 * The raw form exists so tests can use RFC 6238's own ASCII secret directly:
 * embedding its base32 encoding would put a structurally valid TOTP seed in the
 * repo, which secret scanners flag - correctly, since they cannot tell a
 * published test vector from a live one.
 */
export const totp = (secret: string | Buffer, options: TotpOptions = {}): string => {
  const { step = 30, digits = 6, now = Math.floor(Date.now() / 1000) } = options;
  const counter = Math.floor(now / step);

  const message = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer. None of the RFC's own vectors reach
  // a counter above 2^32 (the largest, t=20000000000, is only 666666666), so a
  // 32-bit write would pass every one of them. Written as 64-bit because the
  // spec says 64-bit, not because a test here proves it.
  message.writeBigUInt64BE(BigInt(counter));

  const key = Buffer.isBuffer(secret) ? secret : decodeBase32(secret);
  const digest = createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
};
