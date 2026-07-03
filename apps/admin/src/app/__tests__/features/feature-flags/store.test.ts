jest.mock('server-only', () => ({}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: jest.fn(),
    updateUserMetadata: jest.fn(),
  },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import { getOrgFlags, setOrgFlag } from '@/app/features/feature-flags/store';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

beforeEach(() => jest.clearAllMocks());

describe('getOrgFlags', () => {
  it('returns all-false defaults when no metadata exists', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    const flags = await getOrgFlags('org-1');
    expect(flags).toEqual({ activityPub: false, betaReporting: false, advancedExport: false });
  });

  it('merges stored flags over defaults', async () => {
    mockGet.mockResolvedValue({
      metadata: { flags: { activityPub: true } },
      status: 'OK',
    });
    const flags = await getOrgFlags('org-1');
    expect(flags.activityPub).toBe(true);
    expect(flags.betaReporting).toBe(false);
    expect(flags.advancedExport).toBe(false);
  });

  it('falls back to defaults if stored flags is not an object', async () => {
    mockGet.mockResolvedValue({ metadata: { flags: 'invalid' }, status: 'OK' });
    const flags = await getOrgFlags('org-1');
    expect(flags).toEqual({ activityPub: false, betaReporting: false, advancedExport: false });
  });

  it('uses a per-org storage key', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    await getOrgFlags('org-abc');
    expect(mockGet).toHaveBeenCalledWith('superadmin:org-flags:org-abc');
  });
});

describe('setOrgFlag', () => {
  it('reads current flags, merges the change, and persists', async () => {
    mockGet.mockResolvedValue({
      metadata: { flags: { activityPub: false, betaReporting: false, advancedExport: false } },
      status: 'OK',
    });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    await setOrgFlag('org-1', 'activityPub', true);

    expect(mockUpdate).toHaveBeenCalledWith(
      'superadmin:org-flags:org-1',
      expect.objectContaining({
        flags: expect.objectContaining({ activityPub: true, betaReporting: false }),
      })
    );
  });

  it('does not overwrite other flags when toggling one', async () => {
    mockGet.mockResolvedValue({
      metadata: { flags: { activityPub: true, betaReporting: true, advancedExport: false } },
      status: 'OK',
    });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    await setOrgFlag('org-1', 'advancedExport', true);

    const [, payload] = mockUpdate.mock.calls[0];
    expect((payload as Record<string, unknown>).flags).toEqual({
      activityPub: true,
      betaReporting: true,
      advancedExport: true,
    });
  });
});
