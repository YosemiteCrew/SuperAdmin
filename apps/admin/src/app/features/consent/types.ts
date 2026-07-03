export const CONSENT_CATEGORIES = ['analytics', 'marketing'] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export const CONSENT_SOURCES = ['web', 'mobile'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export function isConsentCategory(v: unknown): v is ConsentCategory {
  return typeof v === 'string' && (CONSENT_CATEGORIES as readonly string[]).includes(v);
}

export function isConsentSource(v: unknown): v is ConsentSource {
  return typeof v === 'string' && (CONSENT_SOURCES as readonly string[]).includes(v);
}

export interface ConsentDecision {
  category: ConsentCategory;
  granted: boolean;
}

export interface ConsentSubmission {
  consentId: string;
  source: ConsentSource;
  decisions: ConsentDecision[];
  email?: string;
  userId?: string;
  policyVersion?: string;
  userAgent?: string;
}
