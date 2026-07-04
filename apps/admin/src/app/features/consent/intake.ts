import {
  isConsentCategory,
  isConsentSource,
  type ConsentDecision,
  type ConsentSubmission,
} from './types';

const LIMITS = {
  consentId: 200,
  email: 254,
  userId: 200,
  policyVersion: 50,
  userAgent: 500,
  maxDecisions: 8,
} as const;

function optionalString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return undefined;
  return trimmed;
}

function parseDecisions(raw: unknown): ConsentDecision[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > LIMITS.maxDecisions) return null;

  const byCategory = new Map<string, ConsentDecision>();
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null;
    const { category, granted } = item as Record<string, unknown>;
    if (!isConsentCategory(category) || typeof granted !== 'boolean') return null;
    // Last decision wins if the same category appears twice in one submission.
    byCategory.set(category, { category, granted });
  }
  return Array.from(byCategory.values());
}

/**
 * Parses an untrusted consent payload from the public endpoint. Returns null
 * on anything invalid; the caller responds 400 without echoing detail to an
 * anonymous client.
 */
export function parseConsentSubmission(
  body: Record<string, unknown>,
  userAgent?: string
): ConsentSubmission | null {
  const consentId = optionalString(body.consentId, LIMITS.consentId);
  if (!consentId) return null;

  if (!isConsentSource(body.source)) return null;

  const decisions = parseDecisions(body.decisions);
  if (!decisions) return null;

  return {
    consentId,
    source: body.source,
    decisions,
    email: optionalString(body.email, LIMITS.email)?.toLowerCase(),
    userId: optionalString(body.userId, LIMITS.userId),
    policyVersion: optionalString(body.policyVersion, LIMITS.policyVersion),
    userAgent: optionalString(userAgent, LIMITS.userAgent),
  };
}
