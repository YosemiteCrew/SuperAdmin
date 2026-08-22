jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

const cookieHeader = { value: 'sAccessToken=abc' };
jest.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => (name === 'cookie' ? cookieHeader.value : null) }),
}));

jest.mock('@/app/config/apiEnvironment', () => {
  const actual = jest.requireActual('@/app/config/apiEnvironment');
  return {
    ...actual,
    apiBaseUrl: (env: string) =>
      env === 'development' ? 'https://devapi.example.com' : 'https://api.example.com',
  };
});

const updateOrganizationMock = jest.fn();
jest.mock('@/app/features/organizations/services/organizationsService', () => ({
  updateOrganization: (...args: unknown[]) => updateOrganizationMock(...args),
}));

const recordAuditEventMock = jest.fn();
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
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
  recordAuditEventMock.mockReset();
});

describe('verifyOrganizationAction', () => {
  it('verifies the business and revalidates', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    const { revalidatePath } = jest.requireMock('next/cache') as { revalidatePath: jest.Mock };
    await verifyOrganizationAction(
      makeForm({ organizationId: 'o1', organizationName: 'Acme Vet' })
    );
    expect(updateOrganizationMock).toHaveBeenCalledWith(
      'o1',
      { isVerified: true },
      {
        headers: { cookie: 'sAccessToken=abc' },
        baseUrl: 'https://api.example.com',
      }
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'org.verify', targetId: 'o1', targetLabel: 'Acme Vet' })
    );
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
    expect(updateOrganizationMock).toHaveBeenCalledWith(
      'o2',
      { isActive: false },
      {
        headers: { cookie: 'sAccessToken=abc' },
        baseUrl: 'https://api.example.com',
      }
    );
  });
});

describe('reactivateOrganizationAction', () => {
  it('sets the business active', async () => {
    const { reactivateOrganizationAction } = await import(ACTIONS);
    await reactivateOrganizationAction(makeForm({ organizationId: 'o3' }));
    expect(updateOrganizationMock).toHaveBeenCalledWith(
      'o3',
      { isActive: true },
      {
        headers: { cookie: 'sAccessToken=abc' },
        baseUrl: 'https://api.example.com',
      }
    );
  });
});

describe('environment routing', () => {
  it('sends the mutation to the development backend when the row came from dev', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(
      makeForm({ organizationId: 'o9', organizationName: 'Dev Vet', env: 'development' })
    );
    expect(updateOrganizationMock).toHaveBeenCalledWith(
      'o9',
      { isVerified: true },
      { headers: { cookie: 'sAccessToken=abc' }, baseUrl: 'https://devapi.example.com' }
    );
  });

  it('marks a non-production action in the audit label', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(
      makeForm({ organizationId: 'o9', organizationName: 'Dev Vet', env: 'development' })
    );
    // Otherwise the audit log would read as if a real business had been made
    // visible to pet parents.
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetLabel: 'Dev Vet [Development]' })
    );
  });

  it('falls back to the id when a dev action has no name', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(makeForm({ organizationId: 'o9', env: 'development' }));
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetLabel: 'o9 [Development]' })
    );
  });

  it('leaves the production label untouched', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(
      makeForm({ organizationId: 'o1', organizationName: 'Acme Vet', env: 'production' })
    );
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetLabel: 'Acme Vet' })
    );
  });

  it('treats an unrecognised env as production', async () => {
    const { verifyOrganizationAction } = await import(ACTIONS);
    await verifyOrganizationAction(
      makeForm({ organizationId: 'o1', organizationName: 'Acme Vet', env: 'staging' })
    );
    expect(updateOrganizationMock).toHaveBeenCalledWith(
      'o1',
      { isVerified: true },
      { headers: { cookie: 'sAccessToken=abc' }, baseUrl: 'https://api.example.com' }
    );
  });
});
