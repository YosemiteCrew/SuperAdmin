const getMock = jest.fn();
jest.mock('@/app/services/http/client', () => ({
  httpClient: { get: (...args: unknown[]) => getMock(...args) },
}));

import { listOrganizations } from '@/app/features/organizations/services/organizationsService';

describe('listOrganizations', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests the super-admin businesses endpoint and returns the list', async () => {
    const businesses = [
      {
        id: 'o1',
        name: 'Acme Vet',
        type: 'HOSPITAL',
        status: 'approved',
        memberCount: 4,
        createdAt: '2026-01-01',
      },
    ];
    getMock.mockResolvedValue({ data: { businesses }, status: 200 });
    const signal = new AbortController().signal;
    const result = await listOrganizations(signal);
    expect(getMock).toHaveBeenCalledWith('/v1/super-admin/businesses', { signal });
    expect(result).toEqual(businesses);
  });

  it('returns an empty array when the payload has no businesses', async () => {
    getMock.mockResolvedValue({ data: {}, status: 200 });
    await expect(listOrganizations()).resolves.toEqual([]);
  });

  it('propagates transport errors to the caller', async () => {
    getMock.mockRejectedValue(new Error('HTTP 404'));
    await expect(listOrganizations()).rejects.toThrow('HTTP 404');
  });
});
