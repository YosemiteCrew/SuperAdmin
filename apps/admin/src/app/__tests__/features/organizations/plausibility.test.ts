jest.mock('next/cache', () => {
  const values = new Map<string, unknown>();
  const unstableCache = jest.fn(
    (read: () => Promise<unknown>, keyParts: string[]) => async (): Promise<unknown> => {
      const key = JSON.stringify(keyParts);
      if (values.has(key)) return values.get(key);
      const value = await read();
      values.set(key, value);
      return value;
    }
  );

  return {
    unstable_cache: unstableCache,
    __clearForTests: () => {
      values.clear();
      unstableCache.mockClear();
    },
  };
});

import {
  PLAUSIBILITY_CHECK_ID,
  corroborateBusiness,
  plausibilityCheck,
  type CorroborationLevel,
  type HostResolver,
} from '@/app/features/organizations/corroboration';
import { DEMO_ORGANIZATION_DETAILS } from '@/app/features/organizations/demo';
import type { SuperAdminOrganizationDetail } from '@/app/features/organizations/types';
import {
  PLAUSIBILITY_LEVELS,
  buildPlausibilityState,
  judgeDetailPlausibility,
  parsePlausibilityAnswer,
  type PlausibilityLevel,
} from '@/app/features/organizations/typesafe-client';

const nextCacheMock = jest.requireMock('next/cache') as {
  unstable_cache: jest.Mock;
  __clearForTests(): void;
};

// Not a credential: the client only checks that TYPE_SAFE_API_KEY is non-empty
// before it calls out, so any non-empty string exercises the same branch.
const TEST_API_KEY = 'this string stands in for a key, it is not one';

const originalApiKey = process.env.TYPE_SAFE_API_KEY;
const originalFetch = globalThis.fetch;
let mockFetch: jest.Mock;

const publicResolver: HostResolver = async () => [{ address: '93.184.216.34' }];

jest.mock('node:dns/promises', () => ({
  lookup: async () => [{ address: '93.184.216.34' }],
}));

beforeEach(() => {
  nextCacheMock.__clearForTests();
  mockFetch = jest.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  process.env.TYPE_SAFE_API_KEY = TEST_API_KEY;
});

afterEach(() => {
  process.env.TYPE_SAFE_API_KEY = originalApiKey;
  globalThis.fetch = originalFetch;
});

/** A response carrying a score answer that rounds to `level`. */
function scored(level: PlausibilityLevel, over: Record<string, unknown> = {}) {
  const index = PLAUSIBILITY_LEVELS.indexOf(level);
  return {
    ok: true,
    json: async () => ({
      model: 'jev-1.13.0',
      answers: {
        detail_plausibility: {
          type: 'score',
          score: index,
          probabilities: { [String(index)]: 0.91 },
          ...over,
        },
      },
      usage: { input_tokens: 120, output_tokens: 8 },
    }),
  };
}

function business(over: Partial<SuperAdminOrganizationDetail>): SuperAdminOrganizationDetail {
  return {
    id: 'o1',
    name: 'Acme Veterinary',
    type: 'HOSPITAL',
    isVerified: false,
    isActive: true,
    memberCount: 3,
    createdAt: '2026-01-01',
    ...over,
  };
}

/** The nine fields the judgment is allowed to see, and nothing else. */
const ALLOWED_FIELDS = [
  'name',
  'type',
  'subType',
  'website',
  'city',
  'country',
  'healthAndSafetyCertNo',
  'animalWelfareComplianceCertNo',
  'fireAndEmergencyCertNo',
];

/** Fields whose absence from the payload is the design, not an oversight. */
const EXCLUDED_FIELDS = [
  'taxId',
  'phoneNo',
  'addressLine',
  'address',
  'postalCode',
  'DUNSNumber',
  'averageRating',
  'ratingCount',
  'memberCount',
  'id',
  'isVerified',
  'isActive',
];

const fullRecord = business({
  website: 'https://acme.com',
  subType: 'COMPANION',
  phoneNo: '+1 555 0100',
  taxId: 'EIN-99-1234567',
  DUNSNumber: '07-842-1199',
  address: {
    addressLine: '500 Mission St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
  },
  healthAndSafetyCertNo: 'HS-2026-0098',
  animalWelfareComplianceCertNo: 'AW-2026-0451',
  fireAndEmergencyCertNo: 'FE-2026-0177',
  googlePlacesId: 'ChIJ-demo-1',
  averageRating: 4.7,
  ratingCount: 212,
});

describe('plausibility payload', () => {
  it('carries exactly the nine permitted identity fields', () => {
    const state = buildPlausibilityState(fullRecord);
    expect(Object.keys(state).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it('omits every excluded field, including from the serialised request body', async () => {
    mockFetch.mockResolvedValue(scored('consistent'));
    await judgeDetailPlausibility(fullRecord.id, buildPlausibilityState(fullRecord));

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(Object.keys(body.state).sort()).toEqual([...ALLOWED_FIELDS].sort());
    for (const field of EXCLUDED_FIELDS) {
      expect(body.state).not.toHaveProperty(field);
    }
    // The excluded values must not reach the wire under any key either.
    const serialised = mockFetch.mock.calls[0][1]?.body as string;
    for (const value of [
      'EIN-99-1234567',
      '+1 555 0100',
      '500 Mission St',
      '94105',
      '07-842-1199',
    ]) {
      expect(serialised).not.toContain(value);
    }
  });

  it('sends a score question over the four ordered levels', async () => {
    mockFetch.mockResolvedValue(scored('thin'));
    await judgeDetailPlausibility(fullRecord.id, buildPlausibilityState(fullRecord));

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    const question = body.questions.detail_plausibility;
    expect(body.model).toBe('jev-latest');
    expect(question.type).toBe('score');
    expect(question.criteria).toHaveLength(PLAUSIBILITY_LEVELS.length);
    expect(question.criteria[0]).toMatch(/^Placeholder\./);
    expect(question.criteria[3]).toMatch(/^Strongly consistent\./);
  });

  it('normalises blank fields to null rather than dropping them', () => {
    const state = buildPlausibilityState(business({ website: '   ', subType: undefined }));
    expect(state.website).toBeNull();
    expect(state.subType).toBeNull();
    expect(state.name).toBe('Acme Veterinary');
  });
});

describe('parsePlausibilityAnswer', () => {
  it('rounds a between-levels score to the nearest level', () => {
    expect(parsePlausibilityAnswer({ score: 1.4, probabilities: { '1': 0.6 } })).toEqual({
      level: 'thin',
      probability: 0.6,
    });
    expect(parsePlausibilityAnswer({ score: 1.6, probabilities: { '2': 0.7 } })).toEqual({
      level: 'consistent',
      probability: 0.7,
    });
  });

  it('reports the chosen level probability, or zero when absent', () => {
    expect(parsePlausibilityAnswer({ score: 0, probabilities: { '3': 0.9 } })).toEqual({
      level: 'placeholder',
      probability: 0,
    });
  });

  it('returns null for a missing, non-numeric or out-of-range score', () => {
    expect(parsePlausibilityAnswer(undefined)).toBeNull();
    expect(parsePlausibilityAnswer({})).toBeNull();
    expect(parsePlausibilityAnswer({ score: 'high' })).toBeNull();
    expect(parsePlausibilityAnswer({ score: Number.NaN })).toBeNull();
    expect(parsePlausibilityAnswer({ score: 4 })).toBeNull();
    expect(parsePlausibilityAnswer({ score: -1 })).toBeNull();
  });
});

describe('judgeDetailPlausibility', () => {
  it('returns null and calls nothing when no key is configured', async () => {
    delete process.env.TYPE_SAFE_API_KEY;
    const result = await judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord));
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports the level, its probability and the call usage', async () => {
    mockFetch.mockResolvedValue(scored('placeholder'));
    const result = await judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord));
    expect(result?.level).toBe('placeholder');
    expect(result?.probability).toBe(0.91);
    expect(result?.usage.inputTokens).toBe(120);
    expect(result?.usage.outputTokens).toBe(8);
    expect(result?.usage.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('uses the shared Next cache with a five minute revalidation window', async () => {
    mockFetch.mockResolvedValue(scored('consistent'));
    await judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord));

    expect(nextCacheMock.unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ['organization-detail-plausibility', 'o1', expect.stringMatching(/^[a-f0-9]{64}$/)],
      { revalidate: 300 }
    );
  });

  it('answers an unchanged record from cache', async () => {
    mockFetch.mockResolvedValue(scored('consistent'));
    const state = buildPlausibilityState(fullRecord);
    const first = await judgeDetailPlausibility('o1', state);
    const second = await judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord));
    expect(second).toEqual(first);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('asks again when the record changes', async () => {
    mockFetch.mockResolvedValue(scored('consistent'));
    await judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord));
    await judgeDetailPlausibility(
      'o1',
      buildPlausibilityState({ ...fullRecord, name: 'Acme Veterinary Ltd' })
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('keys the cache per organization', async () => {
    mockFetch.mockResolvedValue(scored('consistent'));
    const state = buildPlausibilityState(fullRecord);
    await judgeDetailPlausibility('o1', state);
    await judgeDetailPlausibility('o2', state);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails open on a non-OK response, a transport error and an unusable answer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    await expect(
      judgeDetailPlausibility('o1', buildPlausibilityState(fullRecord))
    ).resolves.toBeNull();

    mockFetch.mockRejectedValueOnce(new Error('timeout'));
    await expect(
      judgeDetailPlausibility('o2', buildPlausibilityState(fullRecord))
    ).resolves.toBeNull();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'jev',
        answers: {},
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
    await expect(
      judgeDetailPlausibility('o3', buildPlausibilityState(fullRecord))
    ).resolves.toBeNull();
  });

  it('does not cache a failed call', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const state = buildPlausibilityState(fullRecord);
    await judgeDetailPlausibility('o1', state);
    mockFetch.mockResolvedValue(scored('thin'));
    const retry = await judgeDetailPlausibility('o1', state);
    expect(retry?.level).toBe('thin');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('plausibilityCheck', () => {
  it('renders placeholder as fail, thin as warn and the rest as pass', () => {
    expect(plausibilityCheck('placeholder').status).toBe('fail');
    expect(plausibilityCheck('thin').status).toBe('warn');
    expect(plausibilityCheck('consistent').status).toBe('pass');
    expect(plausibilityCheck('strongly-consistent').status).toBe('pass');
  });

  it('uses one row id and a detail for every level', () => {
    for (const level of PLAUSIBILITY_LEVELS) {
      const check = plausibilityCheck(level);
      expect(check.id).toBe(PLAUSIBILITY_CHECK_ID);
      expect(check.label).toBe('Detail plausibility');
      expect(check.detail.length).toBeGreaterThan(0);
    }
  });
});

/** The four record shapes the aggregate rule has to hold across. */
const SHAPES: Array<{ name: string; org: SuperAdminOrganizationDetail; page: string }> = [
  { name: 'complete record, matching site', org: fullRecord, page: 'Acme Veterinary' },
  {
    name: 'complete record, unmatched site',
    org: fullRecord,
    page: 'parked domain for sale',
  },
  {
    name: 'sparse record, matching site',
    org: business({ website: 'https://acme.com' }),
    page: 'Acme Veterinary',
  },
  {
    name: 'sparse record, no site',
    org: business({ phoneNo: '+1 555 0100' }),
    page: '',
  },
];

const ORDER: CorroborationLevel[] = ['unverified', 'partial', 'corroborated'];

function pageFetch(html: string): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => html,
  }) as unknown as typeof fetch;
}

async function levelWithoutJudgments(org: SuperAdminOrganizationDetail, page: string) {
  const key = process.env.TYPE_SAFE_API_KEY;
  delete process.env.TYPE_SAFE_API_KEY;
  try {
    return await corroborateBusiness(org, pageFetch(page), publicResolver);
  } finally {
    process.env.TYPE_SAFE_API_KEY = key;
  }
}

describe('the judgment can only lower the aggregate level', () => {
  it.each(SHAPES)('holds for a $name', async ({ org, page }) => {
    const today = await levelWithoutJudgments(org, page);

    for (const level of PLAUSIBILITY_LEVELS) {
      nextCacheMock.__clearForTests();
      // Only the plausibility call reaches globalThis.fetch; the page fetch is
      // the injected one, so the website judgment is the same in both arms.
      mockFetch.mockResolvedValue(scored(level));
      const judged = await corroborateBusiness(org, pageFetch(page), publicResolver);

      expect(ORDER.indexOf(judged.level)).toBeLessThanOrEqual(ORDER.indexOf(today.level));
      expect(judged.checks).toHaveLength(today.checks.length + 1);
    }
  });

  it('caps a fully present record at unverified when the details read as placeholder', async () => {
    const today = await levelWithoutJudgments(fullRecord, 'Acme Veterinary');
    expect(today.level).toBe('corroborated');

    nextCacheMock.__clearForTests();
    mockFetch.mockResolvedValue(scored('placeholder'));
    const judged = await corroborateBusiness(
      fullRecord,
      pageFetch('Acme Veterinary'),
      publicResolver
    );
    expect(judged.level).toBe('unverified');
  });

  it('does not let a strong judgment raise a partial record', async () => {
    const partialRecord = business({
      website: 'https://acme.com',
      phoneNo: '+1 555 0100',
      taxId: 'TAX-1',
    });
    const today = await levelWithoutJudgments(partialRecord, 'Acme Veterinary');
    expect(today.level).toBe('partial');

    nextCacheMock.__clearForTests();
    mockFetch.mockResolvedValue(scored('strongly-consistent'));
    const judged = await corroborateBusiness(
      partialRecord,
      pageFetch('Acme Veterinary'),
      publicResolver
    );
    expect(judged.level).toBe('partial');
  });
});

describe('with the judgment client unconfigured', () => {
  it.each(Object.values(DEMO_ORGANIZATION_DETAILS).map((org) => [org.id, org] as const))(
    "reproduces today's checks and level for %s",
    async (_id, org) => {
      delete process.env.TYPE_SAFE_API_KEY;
      const result = await corroborateBusiness(org, pageFetch(org.name), publicResolver);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.checks.some((c) => c.id === PLAUSIBILITY_CHECK_ID)).toBe(false);
      expect(result.checks).toHaveLength(6);
      expect(ORDER).toContain(result.level);
    }
  );
});
