// JWT claims issued in every ActivityPub license token.
// -------------------------------------------------------
// LOCKED FORMAT - both SuperAdmin (issuer) and PIMS AP (verifier) depend on this.
//
// Header: { alg: "RS256", typ: "JWT", kid: <keyId> }
//
// PIMS AP verification steps:
//   1. Decode header, confirm alg === "RS256"
//   2. Fetch signing public key from GET /ap/signing-key.json (24h cache), pick by kid
//   3. Verify RS256 signature
//   4. Assert iss === "yosemitecrew.com"
//   5. Assert aud === "activitypub"
//   6. Assert exp > Math.floor(Date.now() / 1000)
//   7. Assert instanceDomain matches the AP actor's hostname
//   8. Assert jti not present in GET /ap/revoked.json (24h cache)

export type APTokenTier = 'free' | 'pro' | 'enterprise';

export interface APTokenClaims {
  /** Token issuer — always "yosemitecrew.com". */
  iss: 'yosemitecrew.com';
  /** Subject — same as orgId. */
  sub: string;
  /** Audience — always "activitypub". */
  aud: 'activitypub';
  /** JWT ID — used as the revocation lookup key. Same as the DB row id. */
  jti: string;
  /** Issued-at timestamp (Unix epoch seconds). */
  iat: number;
  /** Expiry timestamp (iat + 90 days in seconds). */
  exp: number;
  /** Yosemite Crew organisation identifier. */
  orgId: string;
  /** Hostname of the self-hosted PIMS instance, e.g. "pims.vetclinic.com". */
  instanceDomain: string;
  /** Subscription tier at time of issuance. */
  tier: APTokenTier;
  /** Signing key rotation identifier, e.g. "yc-ap-2026-01". */
  keyId: string;
}

/** 90 days in seconds. */
export const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;
