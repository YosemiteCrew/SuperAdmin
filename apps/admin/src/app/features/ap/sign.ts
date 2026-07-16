import 'server-only';
import { createSign, createPublicKey } from 'node:crypto';
import type { APTokenClaims } from './types';

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64url');
}

/**
 * Signs `claims` as an RS256 JWT using the provided RSA private key PEM.
 * The resulting token is self-contained and can be verified with the
 * corresponding public key from GET /ap/signing-key.json.
 */
export function signAPToken(claims: APTokenClaims, privateKeyPem: string): string {
  const header = JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: claims.keyId });
  const payload = JSON.stringify(claims);
  const signingInput = `${base64url(header)}.${base64url(payload)}`;

  const signer = createSign('SHA256');
  signer.update(signingInput, 'utf8');
  const signature = signer.sign(privateKeyPem);

  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Derives the RSA public key from `privateKeyPem` and returns a JWK Set
 * suitable for serving at GET /ap/signing-key.json.
 */
export function buildSigningKeyJwks(privateKeyPem: string, keyId: string): object {
  const publicKey = createPublicKey(privateKeyPem);
  const jwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
  return {
    keys: [{ ...jwk, kid: keyId, use: 'sig', alg: 'RS256' }],
  };
}
