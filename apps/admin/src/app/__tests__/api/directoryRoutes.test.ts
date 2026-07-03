/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

const verifyMock = jest.fn();
jest.mock('@/app/features/ap/verify', () => ({
  verifyAPToken: (...args: unknown[]) => verifyMock(...args),
}));

const getListedMock = jest.fn();
const setListingMock = jest.fn();
jest.mock('@/app/features/ap/directory', () => {
  const actual = jest.requireActual('@/app/features/ap/directory');
  return {
    validateListingProfile: actual.validateListingProfile,
    getListedClinics: (...args: unknown[]) => getListedMock(...args),
    setListing: (...args: unknown[]) => setListingMock(...args),
  };
});

const rateLimitMock = jest.fn();
jest.mock('@/app/lib/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

jest.mock('@superadmin/database', () => ({ prisma: {} }));

import { GET } from '@/app/api/directory/route';
import { PUT } from '@/app/api/directory/listing/route';

const DOMAIN = 'pims.clinic.com';
const CLAIMS = { orgId: 'org-1', instanceDomain: DOMAIN, jti: 'tok-1' };
const PROFILE = {
  actorUri: `https://${DOMAIN}/ap/actors/org-1`,
  orgName: 'Greenfield Animal Hospital',
  handle: `@greenfield@${DOMAIN}`,
};

function getReq(auth?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/directory', {
    headers: auth ? { authorization: auth } : {},
  });
}

function putReq(body: unknown, auth = 'Bearer tok'): NextRequest {
  return new NextRequest('http://localhost:3000/api/directory/listing', {
    method: 'PUT',
    headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  rateLimitMock.mockReturnValue({ allowed: true, remaining: 19, resetMs: Date.now() + 60_000 });
  verifyMock.mockResolvedValue(CLAIMS);
  getListedMock.mockResolvedValue([{ ...PROFILE, instanceHost: DOMAIN }]);
  setListingMock.mockResolvedValue(undefined);
});

describe('GET /api/directory', () => {
  it('returns 429 when rate-limited, with Retry-After', async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetMs: Date.now() + 30_000 });
    const res = await GET(getReq('Bearer tok'));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
  });

  it('uses a directory-scoped rate-limit key', async () => {
    await GET(getReq('Bearer tok'));
    expect(rateLimitMock).toHaveBeenCalledWith(expect.stringMatching(/^dir:/));
  });

  it('returns 401 without a bearer token and never queries the directory', async () => {
    const res = await GET(getReq());
    expect(res.status).toBe(401);
    expect(getListedMock).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid or revoked token', async () => {
    verifyMock.mockResolvedValue(null);
    const res = await GET(getReq('Bearer bad'));
    expect(res.status).toBe(401);
    expect(getListedMock).not.toHaveBeenCalled();
  });

  it('returns the clinic list with a short private cache', async () => {
    const res = await GET(getReq('Bearer tok'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clinics).toHaveLength(1);
    expect(body.clinics[0]).toEqual({ ...PROFILE, instanceHost: DOMAIN });
    expect(res.headers.get('Cache-Control')).toContain('private');
  });
});

describe('PUT /api/directory/listing', () => {
  it('returns 401 without a bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/directory/listing', {
      method: 'PUT',
      body: JSON.stringify({ listed: true }),
    });
    expect((await PUT(req)).status).toBe(401);
    expect(setListingMock).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', async () => {
    verifyMock.mockResolvedValue(null);
    expect((await PUT(putReq({ listed: false }))).status).toBe(401);
  });

  it('returns 400 for a non-boolean listed', async () => {
    expect((await PUT(putReq({ listed: 'yes' }))).status).toBe(400);
    expect(setListingMock).not.toHaveBeenCalled();
  });

  it('returns 400 when listing without a valid profile', async () => {
    expect((await PUT(putReq({ listed: true }))).status).toBe(400);
    expect(setListingMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the actor URI is on a foreign host', async () => {
    const res = await PUT(
      putReq({ listed: true, ...PROFILE, actorUri: 'https://evil.example/ap/actors/x' })
    );
    expect(res.status).toBe(400);
  });

  it('lists the caller and derives identity from claims, never the body', async () => {
    const res = await PUT(putReq({ listed: true, ...PROFILE, orgId: 'org-victim' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listed: true });
    expect(setListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', instanceDomain: DOMAIN, listed: true })
    );
  });

  it('unlists without requiring a profile', async () => {
    const res = await PUT(putReq({ listed: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listed: false });
    expect(setListingMock).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', listed: false, profile: null })
    );
  });

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/directory/listing', {
      method: 'PUT',
      headers: { authorization: 'Bearer tok' },
      body: 'not json',
    });
    expect((await PUT(req)).status).toBe(400);
  });
});

describe('shared route plumbing', () => {
  it('GET falls back to x-real-ip for the rate-limit key', async () => {
    const req = new NextRequest('http://localhost:3000/api/directory', {
      headers: { authorization: 'Bearer tok', 'x-real-ip': '198.51.100.9' },
    });
    await GET(req);
    expect(rateLimitMock).toHaveBeenCalledWith('dir:198.51.100.9');
  });

  it('GET rejects an empty bearer value', async () => {
    const res = await GET(getReq('Bearer   '));
    expect(res.status).toBe(401);
  });

  it('PUT returns 429 when rate-limited before touching auth', async () => {
    rateLimitMock.mockReturnValue({ allowed: false, remaining: 0, resetMs: Date.now() + 30_000 });
    const res = await PUT(putReq({ listed: false }));
    expect(res.status).toBe(429);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('PUT keys the rate limit by x-forwarded-for first hop', async () => {
    const req = new NextRequest('http://localhost:3000/api/directory/listing', {
      method: 'PUT',
      headers: {
        authorization: 'Bearer tok',
        'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1',
      },
      body: JSON.stringify({ listed: false }),
    });
    await PUT(req);
    expect(rateLimitMock).toHaveBeenCalledWith('dir:203.0.113.7');
  });
});
