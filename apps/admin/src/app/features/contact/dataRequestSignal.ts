import type { RequestType } from '@/app/features/dataRequests/types';

/**
 * A deterministic reading of one contact submission: the kinds of data-subject
 * request its wording resembles, and the phrases that produced that reading.
 *
 * Every entry is advisory. Nothing here creates a DataRequest, starts the
 * statutory clock, or changes what is stored about the sender - it only puts a
 * marker in front of an operator, who decides. The phrases are returned so the
 * marker can show its own evidence rather than asking to be trusted.
 */
export interface DataRequestSignal {
  type: RequestType;
  /** What matched, as the sender wrote it (lowercased, whitespace collapsed). */
  phrases: string[];
}

interface SignalPattern {
  readonly type: RequestType;
  readonly pattern: RegExp;
}

/**
 * Phrase patterns, grouped by request type in REQUEST_TYPES order.
 *
 * Each one demands a verb (or a right's own name) AND a first-person object:
 * "delete my account", not "delete"; "what data do you hold about me", not
 * "data". That is the whole defence against noise - a sales enquiry about a
 * data import, or a support question mentioning an account, matches nothing
 * here, and the tests pin exactly that.
 *
 * Written against text that normalise() has already lowercased and collapsed to
 * single spaces, which is why a literal space is enough between words. Subject
 * and message are joined by " . " so no phrase can be assembled across the two.
 *
 * Deliberately unclever: no stemming, no fuzzy distance, no scoring weights. A
 * reviewer can read a line and say whether it is right, and a phrasing nobody
 * anticipated is a missing line rather than a mystery.
 */
const PATTERNS: readonly SignalPattern[] = [
  // --- access -------------------------------------------------------------
  { type: 'access', pattern: /\b(?:data )?subject access request\b|\bdsar\b/ },
  { type: 'access', pattern: /\bright (?:of|to) access\b/ },
  {
    type: 'access',
    pattern:
      /\b(?:copy|copies|export|download|extract) of (?:all (?:of )?)?(?:my|our) (?:personal )?(?:data|information|info|details|records?)\b/,
  },
  {
    type: 'access',
    pattern:
      /\b(?:send|give|provide|share|email) (?:me|us) (?:all )?(?:my|our) (?:personal )?(?:data|information|records?)\b/,
  },
  {
    type: 'access',
    pattern:
      /\bwhat personal (?:data|information|info) (?:do|have) you (?:have|hold|store|keep|got)\b/,
  },
  {
    type: 'access',
    pattern:
      /\bwhat (?:data|information|info) (?:do|have) you (?:have|hold|store|keep|got) (?:about|on|for) (?:me|us)\b/,
  },
  {
    type: 'access',
    pattern: /\b(?:data|information) you (?:hold|have|store|keep) (?:about|on) (?:me|us)\b/,
  },
  { type: 'access', pattern: /\bwhat do you know about me\b/ },
  {
    type: 'access',
    pattern:
      /\baccess to (?:all (?:of )?)?(?:my|our) (?:personal )?(?:data|information|records?)\b/,
  },

  // --- erasure ------------------------------------------------------------
  { type: 'erasure', pattern: /\bright to be forgotten\b/ },
  {
    type: 'erasure',
    pattern: /\b(?:erasure|deletion) request\b|\bright to (?:erasure|deletion)\b/,
  },
  {
    type: 'erasure',
    pattern:
      /\b(?:delete|erase|remove|wipe|purge|close|cancel|deactivate) (?:my|our) (?:account|profile|data|details|information|info|records?|personal data)\b/,
  },
  {
    type: 'erasure',
    pattern:
      /\b(?:delete|erase|remove|wipe) (?:everything|all (?:the )?(?:data|information|records?))\b/,
  },
  { type: 'erasure', pattern: /\bforget (?:me|about me|everything about me)\b/ },
  {
    type: 'erasure',
    pattern:
      /\b(?:delete|erase|remove) (?:me|us) from your (?:database|databases|records?|system|systems)\b/,
  },
  {
    type: 'erasure',
    pattern:
      /\b(?:my|our) (?:account|data|profile|details|information|records?) (?:to be )?(?:deleted|erased|removed|wiped)\b/,
  },

  // --- rectification ------------------------------------------------------
  { type: 'rectification', pattern: /\bright to rectification\b|\brectification request\b/ },
  {
    type: 'rectification',
    pattern:
      /\b(?:correct|update|change|amend|rectify|fix) (?:my|our) (?:details|data|information|info|records?|personal data)\b/,
  },
  {
    type: 'rectification',
    pattern:
      /\b(?:my|our) (?:details|data|information|records?) (?:are|is) (?:wrong|incorrect|inaccurate|out of date|outdated)\b/,
  },
  {
    type: 'rectification',
    pattern:
      /\byou (?:have|hold) the (?:wrong|incorrect) (?:name|address|email|phone number|phone|details|data|information) (?:for|about|on) (?:me|us)\b/,
  },

  // --- objection ----------------------------------------------------------
  { type: 'objection', pattern: /\bright to object\b/ },
  {
    type: 'objection',
    pattern:
      /\bstop (?:processing|using|storing|sharing|selling|holding) (?:my|our) (?:personal )?(?:data|information|info|details)\b/,
  },
  {
    type: 'objection',
    pattern: /\bobject to (?:the |you |your )?(?:processing|use of my|my data being)\b/,
  },
  { type: 'objection', pattern: /\bopt (?:me|us) out\b/ },
  {
    type: 'objection',
    pattern: /\bopt ?-?out of (?:all )?(?:processing|marketing|profiling|tracking|data)\b/,
  },
  { type: 'objection', pattern: /\b(?:withdraw|revoke) (?:my|our) consent\b/ },
  {
    type: 'objection',
    pattern:
      /\b(?:stop|don't|do not) (?:contacting|emailing|messaging|calling|contact|email|message|call) (?:me|us)\b/,
  },
  { type: 'objection', pattern: /\bstop sending (?:me|us) (?:emails?|marketing|newsletters?)\b/ },
  {
    type: 'objection',
    pattern:
      /\b(?:remove|unsubscribe) (?:me|us) from (?:your )?(?:mailing list|email list|marketing|newsletter)\b/,
  },
];

/**
 * Intake caps subject at 300 and message at 5000, so this bound is never
 * reached from the public form. It exists for rows written before those caps,
 * or by any future caller, so pattern matching stays bounded by construction.
 */
const MAX_SCANNED = 6000;

function normalise(subject: string | null | undefined, message: string | null | undefined): string {
  return `${subject ?? ''} . ${message ?? ''}`
    .slice(0, MAX_SCANNED)
    .toLowerCase()
    .replaceAll(/[‘’ʼ]/gu, "'")
    .replaceAll(/\s+/gu, ' ');
}

/**
 * Reads a contact submission and reports which data-subject request kinds its
 * wording resembles, most-matched first. An empty array means "nothing here
 * reads like one", which is the answer for ordinary support and sales mail.
 *
 * Ties keep PATTERNS order (access, erasure, rectification, objection) so the
 * same message always produces the same list; callers that need one kind take
 * the first, and the rest stay visible rather than being dropped.
 */
export function detectDataRequestSignal(
  input: Readonly<{ subject?: string | null; message?: string | null }>
): DataRequestSignal[] {
  const text = normalise(input.subject, input.message);
  const byType = new Map<RequestType, string[]>();

  for (const { type, pattern } of PATTERNS) {
    const match = pattern.exec(text);
    if (match === null) continue;
    const phrases = byType.get(type) ?? [];
    if (!phrases.includes(match[0])) phrases.push(match[0]);
    byType.set(type, phrases);
  }

  return [...byType.entries()]
    .map(([type, phrases]) => ({ type, phrases }))
    .sort((a, b) => b.phrases.length - a.phrases.length);
}
