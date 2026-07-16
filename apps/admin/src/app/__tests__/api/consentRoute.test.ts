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
  it('fails closed with 503', async () => {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { consentIntakeKey: null } }));
    const { POST: PostNoKey } = await import('@/app/api/consent/route');
    expect((await PostNoKey(req(VALID))).status).toBe(503);
  });
});
