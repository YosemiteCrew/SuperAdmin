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

  it('accepts the yosemitecrew.com form body forwarded verbatim and maps it', async () => {
    const res = await POST(
      req({
        type: 'GENERAL_ENQUIRY',
        source: 'PMS_WEB',
        fullName: 'Lena Weber',
        email: 'lena@example.com',
        phone: '+49 152 277 63275',
        message: 'Which plan fits a two-vet clinic?',
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'lena@example.com',
        name: 'Lena Weber',
        phone: '+49 152 277 63275',
        subject: 'General Enquiry',
      })
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
  /**
   * The logger is mocked rather than spying on console: logger.emit returns
   * early when NODE_ENV === 'test', so a console spy would never fire and the
   * assertion would pass whether or not the guard logged anything at all.
   */
  async function postUnconfigured(): Promise<{ error: jest.Mock }> {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { contactIntakeKey: null } }));
    const error = jest.fn();
    jest.doMock('@/app/lib/logger', () => ({
      logger: { error, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    }));
    const { POST: PostNoKey } = await import('@/app/api/contact/route');
    await PostNoKey(req(VALID_BODY));
    return { error };
  }

  it('logs the refusal, naming the intake and the env var that is missing', async () => {
    const { error } = await postUnconfigured();
    expect(error).toHaveBeenCalledWith('Intake refused: not configured', {
      intake: 'contact',
      envVar: 'CONTACT_INTAKE_KEY',
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
      serverEnv: { contactIntakeKey: 'secret-key' },
    }));
    const error = jest.fn();
    jest.doMock('@/app/lib/logger', () => ({
      logger: { error, warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
    }));
    const { POST: PostConfigured } = await import('@/app/api/contact/route');
    const res = await PostConfigured(req(VALID_BODY, { 'x-contact-key': 'secret-key' }));
    expect(res.status).toBe(200);
    expect(error).not.toHaveBeenCalled();
  });

  it('fails closed with 503', async () => {
    jest.resetModules();
    jest.doMock('@/app/config/env.server', () => ({ serverEnv: { contactIntakeKey: null } }));
    const { POST: PostNoKey } = await import('@/app/api/contact/route');
    const res = await PostNoKey(req(VALID_BODY));
    expect(res.status).toBe(503);
  });
});
