/**
 * @jest-environment node
 */
jest.mock('@superadmin/database', () => ({
  prisma: {
    aPDirectoryListing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/app/features/ap/authenticate', () => ({
  authenticateLicenseToken: jest.fn(),
}));

import type { NextRequest } from 'next/server';
import { prisma } from '@superadmin/database';
import { authenticateLicenseToken } from '@/app/features/ap/authenticate';
import { GET } from '@/app/api/directory/route';
import { PUT } from '@/app/api/directory/listing/route';

const auth = authenticateLicenseToken as jest.MockedFunction<typeof authenticateLicenseToken>;
const listing = prisma.aPDirectoryListing as unknown as {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  upsert: jest.Mock;
  updateMany: jest.Mock;
};

const CLAIMS = {
  iss: 'yosemitecrew.com',
  sub: 'org_test',
  aud: 'activitypub',
  jti: 'tok_abc',
  iat: 0,
  exp: 0,
  orgId: 'org_test',
  instanceDomain: 'pims.example.com',
  tier: 'pro',
  keyId: 'yc-ap-2026-01',
} as const;

function request(body?: unknown, authorization = 'Bearer t'): NextRequest {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? authorization : null) },
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body');
      return body;
    },
  } as unknown as NextRequest;
}

const allow = () => auth.mockResolvedValue({ ok: true, claims: { ...CLAIMS } } as never);

beforeEach(() => {
  jest.clearAllMocks();
  allow();
});

describe('GET /api/directory', () => {
  it('returns only listed clinics', async () => {
    listing.findMany.mockResolvedValue([
      {
        actorUri: 'https://a.example/ap',
        orgName: 'A Vets',
        instanceHost: 'a.example',
        handle: '@a@a.example',
      },
    ]);
    const res = await GET(request());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      clinics: [
        {
          actorUri: 'https://a.example/ap',
          orgName: 'A Vets',
          instanceHost: 'a.example',
          handle: '@a@a.example',
        },
      ],
    });
    expect(listing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { listed: true } })
    );
  });

  it('returns an empty list rather than erroring when nobody is listed', async () => {
    listing.findMany.mockResolvedValue([]);
    await expect((await GET(request())).json()).resolves.toEqual({ clinics: [] });
  });

  it('marks the response private so it cannot land in a shared cache', async () => {
    listing.findMany.mockResolvedValue([]);
    const res = await GET(request());
    expect(res.headers.get('Cache-Control')).toContain('private');
  });

  it('refuses an unauthenticated caller and reads nothing', async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' } as never);
    const res = await GET(request(undefined, ''));
    expect(res.status).toBe(401);
    expect(listing.findMany).not.toHaveBeenCalled();
  });

  it('propagates a 503 when signing is unconfigured', async () => {
    auth.mockResolvedValue({ ok: false, status: 503, error: 'AP signing not configured' } as never);
    expect((await GET(request())).status).toBe(503);
  });
});

describe('PUT /api/directory/listing', () => {
  const body = {
    listed: true,
    actorUri: 'https://pims.example.com/ap/actor',
    orgName: 'Example Vets',
    handle: '@example@pims.example.com',
  };

  it('creates or updates the listing, binding instanceHost from the token', async () => {
    listing.findUnique.mockResolvedValue(null);
    const res = await PUT(request(body));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ listed: true });
    expect(listing.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org_test' },
        create: expect.objectContaining({ instanceHost: 'pims.example.com', listed: true }),
      })
    );
  });

  it('ignores any instanceHost the caller tries to supply', async () => {
    listing.findUnique.mockResolvedValue(null);
    await PUT(request({ ...body, instanceHost: 'attacker.example' }));
    const arg = listing.upsert.mock.calls[0][0];
    expect(arg.create.instanceHost).toBe('pims.example.com');
    expect(arg.update.instanceHost).toBe('pims.example.com');
  });

  it('rejects an actorUri hosted somewhere other than the token domain', async () => {
    const res = await PUT(request({ ...body, actorUri: 'https://attacker.example/ap/actor' }));
    expect(res.status).toBe(403);
    expect(listing.upsert).not.toHaveBeenCalled();
  });

  it('rejects an actorUri that only looks like the domain as a subdomain suffix', async () => {
    const res = await PUT(request({ ...body, actorUri: 'https://pims.example.com.evil.test/ap' }));
    expect(res.status).toBe(403);
  });

  it('ignores a port when comparing the actorUri host to the claim', async () => {
    listing.findUnique.mockResolvedValue(null);
    const res = await PUT(request({ ...body, actorUri: 'https://pims.example.com:8443/ap' }));
    expect(res.status).toBe(200);
  });

  it('rejects a non-https actorUri', async () => {
    const res = await PUT(request({ ...body, actorUri: 'http://pims.example.com/ap' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unparseable actorUri', async () => {
    const res = await PUT(request({ ...body, actorUri: 'not a url' }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-boolean listed', async () => {
    expect((await PUT(request({ ...body, listed: 'yes' }))).status).toBe(400);
  });

  it('rejects an unparseable JSON body', async () => {
    expect((await PUT(request(undefined))).status).toBe(400);
  });

  it.each(['orgName', 'handle', 'actorUri'])('requires %s in order to list', async (field) => {
    const res = await PUT(request({ ...body, [field]: '' }));
    expect(res.status).toBe(400);
    expect(listing.upsert).not.toHaveBeenCalled();
  });

  it('strips control characters from display fields', async () => {
    listing.findUnique.mockResolvedValue(null);
    await PUT(request({ ...body, orgName: 'Example\u0000\u001BVets\u007F' }));
    expect(listing.upsert.mock.calls[0][0].create.orgName).toBe('ExampleVets');
  });

  it('rejects an over-long orgName', async () => {
    const res = await PUT(request({ ...body, orgName: 'x'.repeat(121) }));
    expect(res.status).toBe(400);
  });

  it('refuses to steal an actorUri already registered to another org', async () => {
    listing.findUnique.mockResolvedValue({ orgId: 'org_other' });
    const res = await PUT(request(body));
    expect(res.status).toBe(409);
    expect(listing.upsert).not.toHaveBeenCalled();
  });

  it('allows an org to re-save its own actorUri', async () => {
    listing.findUnique.mockResolvedValue({ orgId: 'org_test' });
    expect((await PUT(request(body))).status).toBe(200);
    expect(listing.upsert).toHaveBeenCalled();
  });

  it('unlists without requiring the display fields', async () => {
    const res = await PUT(request({ listed: false }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ listed: false });
    expect(listing.updateMany).toHaveBeenCalledWith({
      where: { orgId: 'org_test' },
      data: { listed: false },
    });
  });

  it('unlisting is a no-op rather than an error when there is no row', async () => {
    listing.updateMany.mockResolvedValue({ count: 0 });
    expect((await PUT(request({ listed: false }))).status).toBe(200);
  });

  it('refuses an unauthenticated caller and writes nothing', async () => {
    auth.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' } as never);
    const res = await PUT(request(body, ''));
    expect(res.status).toBe(401);
    expect(listing.upsert).not.toHaveBeenCalled();
    expect(listing.updateMany).not.toHaveBeenCalled();
  });
});
