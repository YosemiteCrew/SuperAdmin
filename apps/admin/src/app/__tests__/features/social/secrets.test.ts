import {
  constantTimeEquals,
  open,
  parseKey,
  seal,
  SecretKeyError,
} from '@/app/features/social/secrets';
import { createOAuthState, createPkcePair, statesMatch } from '@/app/features/social/pkce';
import { parseOAuthCookie } from '@/app/features/social/oauthCookie';
import { createHash } from 'node:crypto';

const HEX_KEY = 'a'.repeat(64);

describe('parseKey', () => {
  it('accepts a 64-character hex key', () => {
    expect(parseKey(HEX_KEY)).toHaveLength(32);
  });

  it('accepts a base64 key and ignores surrounding whitespace', () => {
    const base64 = Buffer.alloc(32, 7).toString('base64');
    expect(parseKey(`  ${base64}  `)).toHaveLength(32);
  });

  it('rejects a key of the wrong length', () => {
    expect(() => parseKey('abcd')).toThrow(SecretKeyError);
  });
});

describe('seal/open', () => {
  const key = parseKey(HEX_KEY);

  it('round-trips a value', () => {
    expect(open(seal('hello world', key), key)).toBe('hello world');
  });

  it('produces a different ciphertext each time', () => {
    expect(seal('same', key)).not.toBe(seal('same', key));
  });

  it('returns null for a different key', () => {
    expect(open(seal('secret', key), parseKey('b'.repeat(64)))).toBeNull();
  });

  it('returns null when the ciphertext is tampered with', () => {
    const parts = seal('secret', key).split('.');
    parts[3] = Buffer.from('tampered').toString('base64');
    expect(open(parts.join('.'), key)).toBeNull();
  });

  it('returns null for a malformed or unknown-version payload', () => {
    expect(open('not-sealed', key)).toBeNull();
    expect(open('v9.a.b.c', key)).toBeNull();
  });
});

describe('constantTimeEquals', () => {
  it('matches identical strings', () => {
    expect(constantTimeEquals('abc123', 'abc123')).toBe(true);
  });

  it('rejects different values, different lengths and empties', () => {
    expect(constantTimeEquals('abc123', 'abc124')).toBe(false);
    expect(constantTimeEquals('abc', 'abcd')).toBe(false);
    expect(constantTimeEquals('', '')).toBe(false);
  });
});

describe('pkce', () => {
  it('derives the challenge as a hex sha256 of the verifier', () => {
    const { verifier, challenge } = createPkcePair();
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('hex'));
    expect(challenge).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates a fresh verifier each call', () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
  });

  it('generates opaque state values', () => {
    expect(createOAuthState()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('compares state in constant time', () => {
    expect(statesMatch('abc', 'abc')).toBe(true);
    expect(statesMatch('abc', 'xyz')).toBe(false);
  });
});

describe('parseOAuthCookie', () => {
  it('parses a well-formed payload', () => {
    expect(parseOAuthCookie('{"state":"s","verifier":"v"}')).toEqual({ state: 's', verifier: 'v' });
  });

  it('rejects malformed JSON, wrong types, non-objects and empty fields', () => {
    expect(parseOAuthCookie('nope')).toBeNull();
    expect(parseOAuthCookie('"a string"')).toBeNull();
    expect(parseOAuthCookie('null')).toBeNull();
    expect(parseOAuthCookie('{"state":1,"verifier":"v"}')).toBeNull();
    expect(parseOAuthCookie('{"state":"s"}')).toBeNull();
    expect(parseOAuthCookie('{"state":"","verifier":"v"}')).toBeNull();
  });
});
