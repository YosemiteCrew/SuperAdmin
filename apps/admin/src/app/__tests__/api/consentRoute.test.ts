/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));
jest.mock('@/app/config/env.server', () => ({
  serverEnv: { consentIntakeKey: 'secret-key' },
}));

const recordMock = jest.fn();
jest.mock('@/app/features/consent/store', () => ({
  recordConsent: (...args: unknown[]) => recordMock(...args),
}));

jest.mock('@superadmin/database', () => ({ prisma: {} }));

const rateLimitMock = jest.fn();
jest.mock('@/app/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

import { POST } from '@/app/api/consent/route';

const VALID = {
  consentId: 'ph_123',
  source: 'web',
  decisions: [{ category: 'analytics', granted: true }],
};

function req(body: unknown, headers: Record<string, string> = { 'x-consent-key': 'secret-key' }) {
  return new NextRequest('http://localhost:3000/api/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  rateLimitMock.mockReturnValue({ allowed: true, remaining: 19, resetMs: Date.now() + 60_000 });
  recordMock.mockResolvedValue(undefined);
});

describe('POST /api/consent', () => {
  it('returns 429 when rate-limited, before auth', async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetMs: Date.now() + 30_000 });
    const res = await POST(req(VALID));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
  });

  it('keys the rate limit in a consent-scoped bucket', async () => {
    await POST(req(VALID));
    expect(rateLimitMock).toHaveBeenCalledWith(expect.stringMatching(/^consent:/));
  });

  it('returns 401 for a missing or wrong shared key', async () => {
    expect((await POST(req(VALID, {}))).status).toBe(401);
    expect((await POST(req(VALID, { 'x-consent-key': 'wrong' }))).status).toBe(401);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('records a valid submission and passes the user-agent through', async () => {
    const res = await POST(req(VALID, { 'x-consent-key': 'secret-key', 'user-agent': 'App/1.0' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ consentId: 'ph_123', userAgent: 'App/1.0' })
    );
  });

  it('returns 400 for an invalid submission', async () => {
    const res = await POST(req({ consentId: '', source: 'nope', decisions: [] }));
    expect(res.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    expect((await POST(req('not json'))).status).toBe(400);
  });

  it('falls back to x-real-ip for the rate-limit key', async () => {
    await POST(req(VALID, { 'x-consent-key': 'secret-key', 'x-real-ip': '198.51.100.9' }));
    expect(rateLimitMock).toHaveBeenCalledWith('consent:198.51.100.9');
  });
});

describe('POST /api/consent without a configured key', () => {
  /**
   * The logger is mocked rather than spying on console: logger.emit returns
   * early when NODE_ENV === 'test', so a console spy would never fire and the
   * assertion would pass whether or not the guard logged anything at all.
   */
  async function postUnconfigured(): Promise<{ error: jest.Mock }> {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { consentIntakeKey: null } }));
    const error = jest.fn();
    jest.doMock('@/app/lib/logger', () => ({
      logger: { error, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    }));
    const { POST: PostNoKey } = await import('@/app/api/consent/route');
    await PostNoKey(req(VALID));
    return { error };
  }

  it('logs the refusal, naming the intake and the env var that is missing', async () => {
    const { error } = await postUnconfigured();
    expect(error).toHaveBeenCalledWith('Intake refused: not configured', {
      intake: 'consent',
      envVar: 'CONSENT_INTAKE_KEY',
    });
  });

  it('logs nothing beyond the intake and the env var', async () => {
    const { error } = await postUnconfigured();
    // The presented secret must never reach a log. Asserting the exact context
    // rather than a substring means adding any further field fails here first.
    expect(Object.keys(error.mock.calls[0][1] as object).sort()).toEqual(['envVar', 'intake']);
    expect(JSON.stringify(error.mock.calls[0])).not.toContain('secret-key');
  });

  it('does not log a refusal when the intake IS configured', async () => {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({
      serverEnv: { consentIntakeKey: 'secret-key' },
    }));
    const error = jest.fn();
    jest.doMock('@/app/lib/logger', () => ({
      logger: { error, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    }));
    const { POST: PostConfigured } = await import('@/app/api/consent/route');
    const res = await PostConfigured(req(VALID, { 'x-consent-key': 'secret-key' }));
    expect(res.status).toBe(200);
    expect(error).not.toHaveBeenCalled();
  });

  it('fails closed with 503', async () => {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { consentIntakeKey: null } }));
    const { POST: PostNoKey } = await import('@/app/api/consent/route');
    expect((await PostNoKey(req(VALID))).status).toBe(503);
  });
});
