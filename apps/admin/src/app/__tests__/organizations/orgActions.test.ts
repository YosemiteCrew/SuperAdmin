jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const updateOrganizationMock = jest.fn();
jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  updateOrganization: (...args: unknown[]) => updateOrganizationMock(...args),
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: (...args: unknown[]) => requireSuperAdminMock(...args),
}));

function makeForm(entries: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (v !== undefined) fd.append(k, v);
  }
  return fd;
}

const ACTIONS = '@/app/(routes)/(dashboard)/organizations/actions';

beforeEach(() => {
  requireSuperAdminMock.mockReset();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
  updateOrganizationMock.mockReset();
  updateOrganizationMock.mockResolvedValue(undefined);
});

describe('verifyOrganizationAction', () => {
  it('verifies the business and revalidates', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await verifyOrganizationAction(makeForm({ organizationId: 'o1' }));
    expect(updateOrganizationMock).toHaveBeenCalledWith('o1', { isVerified: true });
    expect(revalidatePath).toHaveBeenCalledWith('/organizations');
  });

  it('skips when the organizationId is missing', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(makeForm({}));
    expect(updateOrganizationMock).not.toHaveBeenCalled();
  });

  it('does nothing when the caller is not a super admin', async () => {
    requireSuperAdminMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
    const { verifyOrganizationAction } = await import(ACTIONS);
    await expect(verifyOrganizationAction(makeForm({ organizationId: 'o1' }))).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(updateOrganizationMock).not.toHaveBeenCalled();
  });
});

describe('suspendOrganizationAction', () => {
  it('sets the business inactive', async () => {
    const { suspendOrganizationAction } = await import(ACTIONS);
    await suspendOrganizationAction(makeForm({ organizationId: 'o2' }));
    expect(updateOrganizationMock).toHaveBeenCalledWith('o2', { isActive: false });
  });
});

describe('reactivateOrganizationAction', () => {
  it('sets the business active', async () => {
    const { reactivateOrganizationAction } = await import(ACTIONS);
    await reactivateOrganizationAction(makeForm({ organizationId: 'o3' }));
    expect(updateOrganizationMock).toHaveBeenCalledWith('o3', { isActive: true });
  });
});
