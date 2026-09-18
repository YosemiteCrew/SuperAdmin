import { test, expect } from '@playwright/test';
import { totp, decodeBase32 } from './support/totp';

/**
 * RFC 6238 Appendix B, the SHA-1 rows. The published vectors are the only way to
 * know this implementation is right without a second implementation to compare
 * against - a hand-rolled expectation would just restate whatever the code does.
 */
// The RFC's secret, in its own raw ASCII form. Its base32 encoding is a
// structurally valid TOTP seed, so it is not committed.
const RFC_SECRET = Buffer.from('12345678901234567890');

const VECTORS: Array<[now: number, code: string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

test.describe('TOTP', () => {
  for (const [now, expected] of VECTORS) {
    test(`matches RFC 6238 at t=${now}`, () => {
      expect(totp(RFC_SECRET, { now, digits: 8 })).toBe(expected);
    });
  }

  test('produces the six digits an authenticator shows', () => {
    expect(totp(RFC_SECRET, { now: 59 })).toBe('287082');
  });

  test('decodes a padded base32 secret', () => {
    expect(decodeBase32('MZXW6===').toString()).toBe('foo');
  });

  // The enrolment screen shows the key in spaced groups and a selection often
  // picks up a trailing space, so these are the shapes a real paste takes.
  test.describe('tolerates how the key is actually copied', () => {
    for (const input of ['MZXW 6===', 'MZXW6=== ', ' MZXW6===', 'mzxw6', 'MZ XW 6']) {
      test(`decodes ${JSON.stringify(input)}`, () => {
        expect(decodeBase32(input).toString()).toBe('foo');
      });
    }
  });

  test('rejects a secret that is not base32', () => {
    expect(() => totp('not base32 !!')).toThrow(/base32/);
  });
});
