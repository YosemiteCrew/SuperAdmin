/**
 * @jest-environment node
 */
jest.mock('@superadmin/database', () => ({
  prisma: {
    aPLicenseToken: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@superadmin/database';
import { GET } from '@/app/api/ap/revoked.json/route';

const mockFindMany = prisma.aPLicenseToken.findMany as jest.MockedFunction<
  typeof prisma.aPLicenseToken.findMany
>;

beforeEach(() => jest.clearAllMocks());

describe('GET /api/ap/revoked.json', () => {
  it('returns an empty array when no tokens are revoked', async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns ids of revoked tokens', async () => {
    mockFindMany.mockResolvedValue([{ id: 'tok_a' }, { id: 'tok_b' }] as never);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual(['tok_a', 'tok_b']);
  });

  it('sets Cache-Control with max-age 86400', async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET();
    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=86400');
  });

  it('queries only revoked (revokedAt not null) records', async () => {
    mockFindMany.mockResolvedValue([]);
    await GET();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { revokedAt: { not: null } },
        select: { id: true },
      })
    );
  });
});
