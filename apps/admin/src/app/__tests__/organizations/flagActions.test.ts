jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
  ensureSuperTokensInit: jest.fn(),
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/app/features/feature-flags/store', () => ({
  setOrgFlag: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { setOrgFlag } from '@/app/features/feature-flags/store';
import { toggleFlagAction } from '@/app/\(routes\)/\(dashboard\)/organizations/[id]/flagActions';

const mockRequire = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockSet = setOrgFlag as jest.MockedFunction<typeof setOrgFlag>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequire.mockResolvedValue({ userId: 'admin-1' } as never);
});

function makeForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('toggleFlagAction', () => {
  it('calls setOrgFlag with correct key and value=true', async () => {
    await toggleFlagAction(makeForm({ orgId: 'org-1', flag: 'activityPub', value: 'true' }));
    expect(mockSet).toHaveBeenCalledWith('org-1', 'activityPub', true);
  });

  it('calls setOrgFlag with value=false', async () => {
    await toggleFlagAction(makeForm({ orgId: 'org-1', flag: 'betaReporting', value: 'false' }));
    expect(mockSet).toHaveBeenCalledWith('org-1', 'betaReporting', false);
  });

  it('records org.flag_on when enabling', async () => {
    await toggleFlagAction(makeForm({ orgId: 'org-1', flag: 'advancedExport', value: 'true' }));
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'org.flag_on', actorId: 'admin-1', targetId: 'org-1' })
    );
  });

  it('records org.flag_off when disabling', async () => {
    await toggleFlagAction(makeForm({ orgId: 'org-1', flag: 'activityPub', value: 'false' }));
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'org.flag_off' }));
  });

  it('returns early when orgId is missing', async () => {
    await toggleFlagAction(makeForm({ flag: 'activityPub', value: 'true' }));
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns early when flag key is unknown', async () => {
    await toggleFlagAction(makeForm({ orgId: 'org-1', flag: 'unknownFlag', value: 'true' }));
    expect(mockSet).not.toHaveBeenCalled();
  });
});
