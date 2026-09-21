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
