import 'server-only';
import { createHash } from 'node:crypto';

/**
 * One answer as the System One API returns it. The fields present depend on the
 * question's primitive (`noul` carries a probability, `score` a position on the
 * level number line), so every field is read defensively and an unusable answer
 * is treated as no answer at all.
 */
interface TypeSafeAnswer {
  type?: string;
  noul?: unknown;
  score?: unknown;
  probabilities?: unknown;
}

interface TypeSafeResponse {
  model: string;
  answers: Record<string, TypeSafeAnswer>;
  usage: { input_tokens: number; output_tokens: number };
}

interface CorroborationState {
  businessName: string;
  finalUrl: string;
  pageText: string;
}

const TYPE_SAFE_API_URL = 'https://api.typesafe.ai/v1/systemone';
const TYPE_SAFE_MODEL = 'jev-latest';
const TYPE_SAFE_TIMEOUT_MS = 1500;

/** Input and output tokens and the round trip that produced one judgment. */
export interface JudgmentUsage {
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/**
 * The website question. `type` is required on every question and its absence is
 * not something the API can answer around, so a request without it fails and
 * `checkWebsite` silently falls back to token overlap. The question id is the
 * key in `questions`, not a field of the question itself.
 */
const WEBSITE_QUESTION_ID = 'is_official_site';

function buildQuestion(state: CorroborationState): { type: string; instructions: object } {
  return {
    type: 'noul',
    instructions: {
      business_name: state.businessName,
      website_url: state.finalUrl,
      page_text: state.pageText,
      question: 'Is this web page the official site of the business named `business_name`?',
    },
  };
}

/**
 * The single outbound path for every judgment. Fails open: a missing key, a
 * non-OK response, a timeout or a transport error all return `null`, and each
 * caller then degrades to the behaviour it had before its judgment existed.
 */
async function postQuestion(
  id: string,
  question: unknown,
  state: unknown
): Promise<{ answer: TypeSafeAnswer | undefined; usage: JudgmentUsage } | null> {
  const apiKey = process.env.TYPE_SAFE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const body = {
    model: TYPE_SAFE_MODEL,
    state: state,
    questions: { [id]: question },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TYPE_SAFE_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(TYPE_SAFE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: TypeSafeResponse = await response.json();
    return {
      answer: data.answers?.[id],
      usage: {
        inputTokens: typeof data.usage?.input_tokens === 'number' ? data.usage.input_tokens : 0,
        outputTokens: typeof data.usage?.output_tokens === 'number' ? data.usage.output_tokens : 0,
        latencyMs: Date.now() - startedAt,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callTypeSafe(state: CorroborationState): Promise<number | null> {
  const result = await postQuestion(WEBSITE_QUESTION_ID, buildQuestion(state), state);
  const answer = result?.answer;
  if (answer && answer.type === 'noul' && typeof answer.noul === 'number') {
    return answer.noul;
  }
  return null;
}

export async function judgeOfficialSite(
  businessName: string,
  finalUrl: string,
  pageText: string
): Promise<number | null> {
  const truncatedText = pageText.slice(0, 4000);
  const state: CorroborationState = {
    businessName,
    finalUrl,
    pageText: truncatedText,
  };

  return callTypeSafe(state);
}

export function mapProbabilityToStatus(
  probability: number,
  passThreshold = 0.8,
  warnThreshold = 0.4
): 'pass' | 'warn' | 'fail' {
  if (probability >= passThreshold) return 'pass';
  if (probability >= warnThreshold) return 'warn';
  return 'fail';
}

export function getStatusDetail(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return "Live, and the page appears to be the business's own site.";
    case 'warn':
      return "Live, but it is unclear if this is the business's official site.";
    case 'fail':
      return "Live, but it does not look like this business's site.";
  }
}

export const CORROBORATION_THRESHOLDS = {
  PASS: 0.8,
  WARN: 0.4,
} as const;

/**
 * Plausibility levels, weakest first. The index in this array is the level
 * number the API scores against, so the order is part of the contract.
 */
export const PLAUSIBILITY_LEVELS = [
  'placeholder',
  'thin',
  'consistent',
  'strongly-consistent',
] as const;

export type PlausibilityLevel = (typeof PLAUSIBILITY_LEVELS)[number];

/**
 * The only fields the plausibility judgment is allowed to see.
 *
 * `taxId`, `phoneNo`, `address.addressLine`, `address.postalCode`,
 * `DUNSNumber`, ratings, member data and everything about the operator are
 * deliberately absent. A sole trader's tax identifier and street address are
 * personal data; the exclusion is the design, not an oversight, and
 * `plausibility payload` in the tests asserts it.
 */
export interface PlausibilityState {
  name: string;
  type: string | null;
  subType: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  healthAndSafetyCertNo: string | null;
  animalWelfareComplianceCertNo: string | null;
  fireAndEmergencyCertNo: string | null;
}

export interface PlausibilityJudgment {
  level: PlausibilityLevel;
  /** The probability the API gave the level that was chosen. */
  probability: number;
  usage: JudgmentUsage;
}

/** How long a judgment stays valid for an unchanged record. */
export const PLAUSIBILITY_CACHE_TTL_SECONDS = 5 * 60;

const PLAUSIBILITY_QUESTION = {
  type: 'score',
  instructions:
    'The state is the identity block a business submitted when registering as an animal ' +
    'care provider. Do these details read as a real, operating animal care business, or ' +
    'as placeholder or filler text? Judge the content of the values, not whether the ' +
    'fields are filled in.',
  criteria: [
    'Placeholder. One or more values are filler rather than real: a specimen or example ' +
      'name, a test or demo value, a repeated or sequential identifier, a stand-in such as ' +
      '"N/A" or "test", or a certificate number that reads as invented for a form.',
    'Thin. The values are not obviously fake but carry almost nothing specific: a generic ' +
      'trading name, a locality that does not narrow anything down, or so few filled ' +
      'fields that no particular business is identified.',
    'Consistent. The values read as a real animal care business: a trading name that suits ' +
      'the business type, a real city and country, and identifiers in a shape an issuing ' +
      'authority would use.',
    'Strongly consistent. The values corroborate one another and identify a specific ' +
      'operating animal care business: the name, business type, locality and certificate ' +
      'numbers all fit together as one real practice.',
  ],
} as const;

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Builds the plausibility payload: exactly the nine identity fields, no more. */
export function buildPlausibilityState(org: {
  name: string;
  type?: string;
  subType?: string;
  website?: string;
  address?: { city?: string; country?: string };
  healthAndSafetyCertNo?: string;
  animalWelfareComplianceCertNo?: string;
  fireAndEmergencyCertNo?: string;
}): PlausibilityState {
  return {
    name: org.name,
    type: emptyToNull(org.type),
    subType: emptyToNull(org.subType),
    website: emptyToNull(org.website),
    city: emptyToNull(org.address?.city),
    country: emptyToNull(org.address?.country),
    healthAndSafetyCertNo: emptyToNull(org.healthAndSafetyCertNo),
    animalWelfareComplianceCertNo: emptyToNull(org.animalWelfareComplianceCertNo),
    fireAndEmergencyCertNo: emptyToNull(org.fireAndEmergencyCertNo),
  };
}

/**
 * Reads a score answer as a discrete level. `score` is a position on the level
 * number line and can land between levels, so it rounds to the nearest; the
 * probability reported alongside is that level's own probability.
 */
export function parsePlausibilityAnswer(
  answer: TypeSafeAnswer | undefined
): { level: PlausibilityLevel; probability: number } | null {
  const raw = answer?.score;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const index = Math.round(raw);
  if (index < 0 || index >= PLAUSIBILITY_LEVELS.length) return null;
  const probabilities = answer?.probabilities;
  const atLevel =
    probabilities && typeof probabilities === 'object'
      ? (probabilities as Record<string, unknown>)[String(index)]
      : undefined;
  return {
    level: PLAUSIBILITY_LEVELS[index],
    probability: typeof atLevel === 'number' && Number.isFinite(atLevel) ? atLevel : 0,
  };
}

async function requestDetailPlausibility(state: PlausibilityState): Promise<PlausibilityJudgment> {
  const result = await postQuestion('detail_plausibility', PLAUSIBILITY_QUESTION, state);
  if (!result) throw new Error('plausibility judgment unavailable');
  const parsed = parsePlausibilityAnswer(result.answer);
  if (!parsed) throw new Error('plausibility judgment unavailable');
  return { ...parsed, usage: result.usage };
}

/**
 * Judges whether an organization's submitted details read as a real business or
 * as filler. Returns `null` on every failure path: unconfigured key, timeout,
 * transport error, unusable answer — and the caller then reports exactly the
 * checks and the level it reported before this judgment existed.
 */
export async function judgeDetailPlausibility(
  orgId: string,
  state: PlausibilityState
): Promise<PlausibilityJudgment | null> {
  if (!process.env.TYPE_SAFE_API_KEY) return null;

  try {
    const { unstable_cache } = await import('next/cache');
    const stateHash = createHash('sha256').update(JSON.stringify(state)).digest('hex');
    const readCached = unstable_cache(
      () => requestDetailPlausibility(state),
      ['organization-detail-plausibility', orgId, stateHash],
      { revalidate: PLAUSIBILITY_CACHE_TTL_SECONDS }
    );
    return await readCached();
  } catch {
    return null;
  }
}
