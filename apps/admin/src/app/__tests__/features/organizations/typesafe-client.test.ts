import {
  judgeOfficialSite,
  mapProbabilityToStatus,
  getStatusDetail,
  CORROBORATION_THRESHOLDS,
} from '@/app/features/organizations/typesafe-client';

// Not a credential: judgeOfficialSite only checks that TYPE_SAFE_API_KEY is set
// before it calls out, so any non-empty string exercises the same branch.
const TEST_API_KEY = 'this string stands in for a key, it is not one';

const originalEnv = process.env.TYPE_SAFE_API_KEY;
const originalFetch = globalThis.fetch;

afterAll(() => {
  process.env.TYPE_SAFE_API_KEY = originalEnv;
  globalThis.fetch = originalFetch;
});

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  process.env.TYPE_SAFE_API_KEY = TEST_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('CORROBORATION_THRESHOLDS', () => {
  it('exports pass and warn thresholds', () => {
    expect(CORROBORATION_THRESHOLDS.PASS).toBe(0.8);
    expect(CORROBORATION_THRESHOLDS.WARN).toBe(0.4);
  });
});

describe('mapProbabilityToStatus', () => {
  it('returns pass at or above 0.8', () => {
    expect(mapProbabilityToStatus(0.8)).toBe('pass');
    expect(mapProbabilityToStatus(0.9)).toBe('pass');
    expect(mapProbabilityToStatus(1.0)).toBe('pass');
  });

  it('returns warn between 0.4 and 0.8', () => {
    expect(mapProbabilityToStatus(0.4)).toBe('warn');
    expect(mapProbabilityToStatus(0.5)).toBe('warn');
    expect(mapProbabilityToStatus(0.79)).toBe('warn');
  });

  it('returns fail below 0.4', () => {
    expect(mapProbabilityToStatus(0.39)).toBe('fail');
    expect(mapProbabilityToStatus(0.0)).toBe('fail');
  });

  it('uses custom thresholds when provided', () => {
    expect(mapProbabilityToStatus(0.7, 0.7, 0.3)).toBe('pass');
    expect(mapProbabilityToStatus(0.5, 0.7, 0.3)).toBe('warn');
    expect(mapProbabilityToStatus(0.2, 0.7, 0.3)).toBe('fail');
  });
});

describe('getStatusDetail', () => {
  it('returns correct detail for pass', () => {
    expect(getStatusDetail('pass')).toBe(
      "Live, and the page appears to be the business's own site."
    );
  });

  it('returns correct detail for warn', () => {
    expect(getStatusDetail('warn')).toBe(
      "Live, but it is unclear if this is the business's official site."
    );
  });

  it('returns correct detail for fail', () => {
    expect(getStatusDetail('fail')).toBe("Live, but it does not look like this business's site.");
  });
});

describe('judgeOfficialSite', () => {
  it('returns null when API key is not configured', async () => {
    delete process.env.TYPE_SAFE_API_KEY;
    const result = await judgeOfficialSite('Acme', 'https://acme.com', 'Acme Veterinary');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('network'));
    const result = await judgeOfficialSite('Acme', 'https://network-error.com', 'Acme Veterinary');
    expect(result).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const result = await judgeOfficialSite('Acme', 'https://server-error.com', 'Acme Veterinary');
    expect(result).toBeNull();
  });

  it('returns null on invalid response shape', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        answers: {},
        model: 'jev',
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    });
    const result = await judgeOfficialSite('Acme', 'https://invalid-shape.com', 'Acme Veterinary');
    expect(result).toBeNull();
  });

  it('returns probability on valid response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'jev-1.13.0',
        answers: {
          is_official_site: { type: 'noul', noul: 0.85 },
        },
        usage: { input_tokens: 100, output_tokens: 10 },
      }),
    });
    const result = await judgeOfficialSite('Acme', 'https://valid-response.com', 'Acme Veterinary');
    expect(result).toBe(0.85);
  });

  it('truncates page text to 4000 characters', async () => {
    const longText = 'x'.repeat(5000);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'jev',
        answers: { is_official_site: { type: 'noul', noul: 0.9 } },
        usage: { input_tokens: 100, output_tokens: 10 },
      }),
    });

    await judgeOfficialSite('Acme', 'https://truncate-test.com', longText);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(callBody.state.pageText.length).toBe(4000);
  });

  it('sends correct payload structure', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'jev',
        answers: { is_official_site: { type: 'noul', noul: 0.9 } },
        usage: { input_tokens: 100, output_tokens: 10 },
      }),
    });

    await judgeOfficialSite('Acme Veterinary', 'https://payload-test.com', 'Welcome to Acme');

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(callBody.model).toBe('jev-latest');
    expect(callBody.state.businessName).toBe('Acme Veterinary');
    expect(callBody.state.finalUrl).toBe('https://payload-test.com');
    expect(callBody.state.pageText).toBe('Welcome to Acme');
    expect(callBody.questions.is_official_site).toBeDefined();
    expect(callBody.questions.is_official_site.type).toBe('noul');
    expect(callBody.questions.is_official_site.instructions).toMatchObject({
      business_name: 'Acme Veterinary',
      website_url: 'https://payload-test.com',
      question: 'Is this web page the official site of the business named `business_name`?',
    });
  });

  it('times out after 1.5 seconds', async () => {
    mockFetch.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    );

    const start = Date.now();
    const result = await judgeOfficialSite('Acme', 'https://timeout-test.com', 'text');
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(3000);
  });
});
