/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: { contactIntakeKey: 'secret-key' },
}));

const recordMock = jest.fn();
jest.mock('@/app/features/contact/intake', () => {
  const actual = jest.requireActual('@/app/features/contact/intake');
  return {
    parseSubmission: actual.parseSubmission,
    isHoneypotTripped: actual.isHoneypotTripped,
    recordContactSubmission: (...args: unknown[]) => recordMock(...args),
  };
});

jest.mock('@superadmin/database', () => ({ prisma: {} }));

const rateLimitMock = jest.fn();
jest.mock('@/app/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

import { POST } from '@/app/api/contact/route';

const VALID_BODY = {
  email: 'prospect@clinic.com',
  message: 'We would like a demo of Yosemite Crew.',
  newsletterConsent: true,
  sourceUrl: 'https://www.yosemitecrew.com/contact-us',
};

function req(body: unknown, headers: Record<string, string> = { 'x-contact-key': 'secret-key' }) {
  return new NextRequest('http://localhost:3000/api/contact', {
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

describe('POST /api/contact', () => {
  it('returns 429 when rate-limited, before any auth work', async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetMs: Date.now() + 30_000 });
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
  });

  it('keys the rate limit in a contact-scoped bucket', async () => {
    await POST(req(VALID_BODY));
    expect(rateLimitMock).toHaveBeenCalledWith(expect.stringMatching(/^contact:/));
  });

  it('returns 401 when the shared key is missing or wrong', async () => {
    expect((await POST(req(VALID_BODY, {}))).status).toBe(401);
    expect((await POST(req(VALID_BODY, { 'x-contact-key': 'wrong' }))).status).toBe(401);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('stores a valid submission and returns ok', async () => {
    const res = await POST(req(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'prospect@clinic.com', newsletterConsent: true })
    );
  });

  it('silently accepts and drops a honeypot-tripped bot submission', async () => {
    const res = await POST(req({ ...VALID_BODY, website: 'http://spam.example' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid submission', async () => {
    const res = await POST(req({ email: 'nope', message: '' }));
    expect(res.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(req('not json'));
    expect(res.status).toBe(400);
  });

  it('falls back to x-real-ip for the rate-limit key', async () => {
    await POST(req(VALID_BODY, { 'x-contact-key': 'secret-key', 'x-real-ip': '198.51.100.9' }));
    expect(rateLimitMock).toHaveBeenCalledWith('contact:198.51.100.9');
  });
});

describe('POST /api/contact without a configured key', () => {
  it('fails closed with 503', async () => {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { contactIntakeKey: null } }));
    const { POST: PostNoKey } = await import('@/app/api/contact/route');
    const res = await PostNoKey(req(VALID_BODY));
    expect(res.status).toBe(503);
  });
});
