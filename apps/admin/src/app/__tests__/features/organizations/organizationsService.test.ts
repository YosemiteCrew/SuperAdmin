const getMock = jest.fn();
const patchMock = jest.fn();
jest.mock('@/app/services/http/client', () => ({
  httpClient: {
    get: (...args: unknown[]) => getMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

import {
  getOrganization,
  listOrganizations,
  updateOrganization,
} from '@/app/features/organizations/services/organizationsService';

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
        isVerified: false,
        isActive: true,
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

describe('getOrganization', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests the per-business endpoint (url-encoded) and returns the business', async () => {
    const business = {
      id: 'o1',
      name: 'Acme Vet',
      type: 'HOSPITAL',
      isVerified: true,
      isActive: true,
    };
    getMock.mockResolvedValue({ data: { business }, status: 200 });
    const signal = new AbortController().signal;
    const result = await getOrganization('a/b', signal);
    expect(getMock).toHaveBeenCalledWith('/v1/super-admin/businesses/a%2Fb', { signal });
    expect(result).toEqual(business);
  });

  it('propagates transport errors', async () => {
    getMock.mockRejectedValue(new Error('HTTP 404'));
    await expect(getOrganization('o1')).rejects.toThrow('HTTP 404');
  });
});

describe('updateOrganization', () => {
  beforeEach(() => {
    patchMock.mockReset();
    patchMock.mockResolvedValue({ data: {}, status: 200 });
  });

  it('PATCHes the verification flag to the per-business endpoint', async () => {
    await updateOrganization('o1', { isVerified: true });
    expect(patchMock).toHaveBeenCalledWith('/v1/super-admin/businesses/o1', { isVerified: true });
  });

  it('url-encodes the id and forwards the active flag', async () => {
    await updateOrganization('a/b 1', { isActive: false });
    expect(patchMock).toHaveBeenCalledWith('/v1/super-admin/businesses/a%2Fb%201', {
      isActive: false,
    });
  });

  it('propagates transport errors', async () => {
    patchMock.mockRejectedValue(new Error('HTTP 500'));
    await expect(updateOrganization('o1', { isVerified: true })).rejects.toThrow('HTTP 500');
  });
});
