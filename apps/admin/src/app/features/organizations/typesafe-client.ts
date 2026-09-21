import 'server-only';

interface TypeSafeAnswer {
  type: 'noul';
  noul: number;
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

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

interface CacheEntry {
  probability: number;
  timestamp: number;
}

const judgmentCache = new Map<string, CacheEntry>();

function cacheKey(businessName: string, finalUrl: string): string {
  return `${businessName}|${finalUrl}`;
}

function getFromCache(businessName: string, finalUrl: string): number | null {
  const key = cacheKey(businessName, finalUrl);
  const entry = judgmentCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    judgmentCache.delete(key);
    return null;
  }
  return entry.probability;
}

function setCache(businessName: string, finalUrl: string, probability: number): void {
  const key = cacheKey(businessName, finalUrl);
  judgmentCache.set(key, { probability, timestamp: Date.now() });
}

function buildQuestion(state: CorroborationState): { id: string; instructions: object } {
  return {
    id: 'is_official_site',
    instructions: {
      business_name: state.businessName,
      website_url: state.finalUrl,
      page_text: state.pageText,
      question: 'Is this web page the official site of the business named `business_name`?',
    },
  };
}

async function callTypeSafe(state: CorroborationState): Promise<number | null> {
  const apiKey = process.env.TYPE_SAFE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const question = buildQuestion(state);
  const body = {
    model: TYPE_SAFE_MODEL,
    state: state,
    questions: { [question.id]: question },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TYPE_SAFE_TIMEOUT_MS);

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data: TypeSafeResponse = await response.json();
    const answer = data.answers.is_official_site;
    if (answer && answer.type === 'noul' && typeof answer.noul === 'number') {
      return answer.noul;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function judgeOfficialSite(
  businessName: string,
  finalUrl: string,
  pageText: string
): Promise<number | null> {
  const cached = getFromCache(businessName, finalUrl);
  if (cached !== null) {
    return cached;
  }

  const truncatedText = pageText.slice(0, 4000);
  const state: CorroborationState = {
    businessName,
    finalUrl,
    pageText: truncatedText,
  };

  const probability = await callTypeSafe(state);
  if (probability !== null) {
    setCache(businessName, finalUrl, probability);
  }
  return probability;
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
