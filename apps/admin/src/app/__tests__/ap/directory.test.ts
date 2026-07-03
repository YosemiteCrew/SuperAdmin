jest.mock('server-only', () => ({}));
jest.mock('@superadmin/database', () => ({
  prisma: {
    directoryListing: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    aPLicenseToken: { findMany: jest.fn() },
  },
}));

import { prisma } from '@superadmin/database';
import {
  getListedClinics,
  setListing,
  validateListingProfile,
} from '@/app/features/ap/directory';

const mockUpsert = prisma.directoryListing.upsert as jest.Mock;
const mockUpdateMany = prisma.directoryListing.updateMany as jest.Mock;
const mockListingFind = prisma.directoryListing.findMany as jest.Mock;
const mockTokenFind = prisma.aPLicenseToken.findMany as jest.Mock;

const DOMAIN = 'pims.clinic.com';
const PROFILE = {
  actorUri: `https://${DOMAIN}/ap/actors/org-1`,
  orgName: 'Greenfield Animal Hospital',
  handle: `@greenfield@${DOMAIN}`,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({});
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockListingFind.mockResolvedValue([]);
  mockTokenFind.mockResolvedValue([]);
});

describe('validateListingProfile', () => {
  it('accepts a profile pinned to the licensed domain', () => {
    expect(validateListingProfile({ ...PROFILE }, DOMAIN)).toEqual(PROFILE);
  });

  it('trims the org name', () => {
    const result = validateListingProfile({ ...PROFILE, orgName: '  Clinic  ' }, DOMAIN);
    expect(result?.orgName).toBe('Clinic');
  });

  it.each([
    ['actor on a different host', { actorUri: 'https://evil.example/ap/actors/x' }],
    ['non-https actor', { actorUri: `http://${DOMAIN}/ap/actors/org-1` }],
    ['unparseable actor', { actorUri: 'not a url' }],
    ['handle on a different host', { handle: '@greenfield@evil.example' }],
    ['handle without leading @', { handle: `greenfield@${DOMAIN}` }],
    ['handle without a name', { handle: `@@${DOMAIN}` }],
    ['empty org name', { orgName: '   ' }],
    ['oversized org name', { orgName: 'x'.repeat(201) }],
    ['oversized actor uri', { actorUri: `https://${DOMAIN}/${'a'.repeat(500)}` }],
    ['missing fields', { actorUri: undefined }],
    ['non-string fields', { orgName: 42 }],
  ])('rejects %s', (_label, over) => {
    expect(validateListingProfile({ ...PROFILE, ...over }, DOMAIN)).toBeNull();
  });
});

describe('setListing', () => {
  it('upserts the row with instanceHost from the claim, not the body', async () => {
    await setListing({ orgId: 'org-1', instanceDomain: DOMAIN, listed: true, profile: PROFILE });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-1' },
        create: expect.objectContaining({ listed: true, instanceHost: DOMAIN }),
        update: expect.objectContaining({ listed: true, instanceHost: DOMAIN }),
      })
    );
  });

  it('refuses to list without a profile', async () => {
    await expect(
      setListing({ orgId: 'org-1', instanceDomain: DOMAIN, listed: true, profile: null })
    ).rejects.toThrow(/profile/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('unlists via updateMany so unknown orgs are a no-op', async () => {
    await setListing({ orgId: 'org-1', instanceDomain: DOMAIN, listed: false, profile: null });
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      data: { listed: false },
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe('getListedClinics', () => {
  const listing = (orgId: string, name: string) => ({
    orgId,
    listed: true,
    actorUri: `https://${DOMAIN}/ap/actors/${orgId}`,
    orgName: name,
    instanceHost: DOMAIN,
    handle: `@${name.toLowerCase()}@${DOMAIN}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('returns only listed clinics holding a currently-valid license', async () => {
    mockListingFind.mockResolvedValue([listing('org-1', 'Alpha'), listing('org-2', 'Beta')]);
    mockTokenFind.mockResolvedValue([{ orgId: 'org-1' }]);

    const clinics = await getListedClinics();
    expect(clinics).toHaveLength(1);
    expect(clinics[0].orgName).toBe('Alpha');
    expect(mockTokenFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: null }),
      })
    );
  });

  it('exposes only the four public fields', async () => {
    mockListingFind.mockResolvedValue([listing('org-1', 'Alpha')]);
    mockTokenFind.mockResolvedValue([{ orgId: 'org-1' }]);

    const [clinic] = await getListedClinics();
    expect(Object.keys(clinic).sort()).toEqual(['actorUri', 'handle', 'instanceHost', 'orgName']);
  });

  it('returns an empty list when no listed clinic has a valid license', async () => {
    mockListingFind.mockResolvedValue([listing('org-1', 'Alpha')]);
    mockTokenFind.mockResolvedValue([]);
    expect(await getListedClinics()).toEqual([]);
  });
});
