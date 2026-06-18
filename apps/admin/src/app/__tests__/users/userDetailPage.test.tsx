import { render, screen } from '@testing-library/react';

const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...a: unknown[]) => getUserMock(...a) },
}));

const getAllSessionHandlesMock = jest.fn();
const getSessionInformationMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    getAllSessionHandlesForUser: (...a: unknown[]) => getAllSessionHandlesMock(...a),
    getSessionInformation: (...a: unknown[]) => getSessionInformationMock(...a),
  },
}));

const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: (...a: unknown[]) => getUserMetadataMock(...a) },
}));

const listDevicesMock = jest.fn();
jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: (...a: unknown[]) => listDevicesMock(...a) },
}));

const getRolesForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getRolesForUser: (...a: unknown[]) => getRolesForUserMock(...a) },
}));

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: { superadminBootstrapEmails: ['boot@example.com'] },
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/app/(routes)/(dashboard)/users/[id]/SessionsSection', () => ({
  SessionsSection: () => <div data-testid="sessions" />,
}));
jest.mock('@/app/(routes)/(dashboard)/users/[id]/ResetMfaButton', () => ({
  ResetMfaButton: () => <div data-testid="reset-mfa" />,
}));
jest.mock('@/app/(routes)/(dashboard)/users/[id]/RoleButton', () => ({
  RoleButton: () => <div data-testid="role-button" />,
}));
jest.mock('@/app/(routes)/(dashboard)/users/DeleteUserButton', () => ({
  DeleteUserButton: () => <div data-testid="delete-user" />,
}));

type AnyUser = Record<string, unknown>;
function makeUser(over: AnyUser = {}): AnyUser {
  return {
    id: 'u-1',
    emails: ['user@example.com'],
    loginMethods: [{ recipeId: 'emailpassword' }],
    tenantIds: ['public'],
    phoneNumbers: [],
    timeJoined: 1_700_000_000_000,
    isPrimaryUser: true,
    ...over,
  };
}

async function renderPage(id = 'u-1') {
  const mod = await import('@/app/(routes)/(dashboard)/users/[id]/page');
  const ui = await mod.default({ params: Promise.resolve({ id }) });
  render(ui);
}

beforeEach(() => {
  jest.clearAllMocks();
  getUserMock.mockResolvedValue(makeUser());
  getAllSessionHandlesMock.mockResolvedValue([]);
  getSessionInformationMock.mockResolvedValue(undefined);
  getUserMetadataMock.mockResolvedValue({ metadata: {} });
  listDevicesMock.mockResolvedValue({ status: 'OK', devices: [] });
  getRolesForUserMock.mockResolvedValue({ roles: [] });
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
});

describe('UserDetailPage', () => {
  it('calls notFound when the user does not exist', async () => {
    getUserMock.mockResolvedValueOnce(undefined);
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders a standard (non-admin) user with a role-management button', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: 'user@example.com' })).toBeInTheDocument();
    expect(screen.getByText('Standard user')).toBeInTheDocument();
    expect(screen.getByText('Standard account with no super-admin access.')).toBeInTheDocument();
    expect(screen.getByText('No verified TOTP device')).toBeInTheDocument();
    expect(screen.getByText('No sign-in recorded since tracking was enabled')).toBeInTheDocument();
    expect(screen.getByTestId('role-button')).toBeInTheDocument();
  });

  it('renders a role-based super admin with the Role badge and TOTP status', async () => {
    getRolesForUserMock.mockResolvedValue({ roles: ['superadmin'] });
    getUserMetadataMock.mockResolvedValue({ metadata: { lastSignInAt: 1_700_500_000_000 } });
    listDevicesMock.mockResolvedValue({
      status: 'OK',
      devices: [{ name: 'd1', verified: true }],
    });
    getAllSessionHandlesMock.mockResolvedValue(['h1', 'h2']);
    getSessionInformationMock.mockImplementation((h: string) =>
      h === 'h1' ? Promise.resolve({ sessionHandle: 'h1' }) : Promise.reject(new Error('gone'))
    );

    await renderPage();
    expect(screen.getByText('Super admin')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('TOTP active (1 device)')).toBeInTheDocument();
    expect(
      screen.getByText('Can manage every user and organization in this panel.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('role-button')).toBeInTheDocument();
  });

  it('marks a bootstrap-allowlisted user as Bootstrap and hides the role button', async () => {
    getUserMock.mockResolvedValue(makeUser({ emails: ['boot@example.com'] }));
    listDevicesMock.mockResolvedValue({
      status: 'OK',
      devices: [
        { name: 'd1', verified: true },
        { name: 'd2', verified: true },
      ],
    });

    await renderPage();
    expect(screen.getByText('Super admin')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap')).toBeInTheDocument();
    expect(screen.getByText('TOTP active (2 devices)')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Granted via the environment bootstrap allowlist and cannot be changed from here.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('role-button')).not.toBeInTheDocument();
  });

  it('blocks self-management when the caller views their own account', async () => {
    requireSuperAdminMock.mockResolvedValue({ userId: 'u-1' });
    await renderPage();
    expect(screen.getByText('You cannot change your own access.')).toBeInTheDocument();
    expect(screen.queryByTestId('role-button')).not.toBeInTheDocument();
  });

  it('still renders when every data loader fails (catch paths)', async () => {
    getAllSessionHandlesMock.mockRejectedValue(new Error('x'));
    getUserMetadataMock.mockRejectedValue(new Error('x'));
    listDevicesMock.mockRejectedValue(new Error('x'));
    getRolesForUserMock.mockRejectedValue(new Error('x'));
    await renderPage();
    expect(screen.getByText('Standard user')).toBeInTheDocument();
    expect(screen.getByTestId('sessions')).toBeInTheDocument();
  });

  it('falls back gracefully for a user with no emails, methods, or phone, and shows phone when present', async () => {
    getUserMock.mockResolvedValue(
      makeUser({
        emails: [],
        loginMethods: [],
        tenantIds: [],
        phoneNumbers: ['+15551230000'],
        isPrimaryUser: false,
      })
    );
    await renderPage();
    expect(screen.getByText('+15551230000')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it('uses the user email as the title', async () => {
    getUserMock.mockResolvedValueOnce(makeUser({ emails: ['meta@example.com'] }));
    const mod = await import('@/app/(routes)/(dashboard)/users/[id]/page');
    await expect(mod.generateMetadata({ params: Promise.resolve({ id: 'u-1' }) })).resolves.toEqual(
      { title: 'meta@example.com' }
    );
  });

  it('falls back to a default title when the lookup throws', async () => {
    getUserMock.mockRejectedValueOnce(new Error('boom'));
    const mod = await import('@/app/(routes)/(dashboard)/users/[id]/page');
    await expect(mod.generateMetadata({ params: Promise.resolve({ id: 'u-1' }) })).resolves.toEqual(
      { title: 'User detail' }
    );
  });

  it('falls back to a default title when there is no user', async () => {
    getUserMock.mockResolvedValueOnce(undefined);
    const mod = await import('@/app/(routes)/(dashboard)/users/[id]/page');
    await expect(mod.generateMetadata({ params: Promise.resolve({ id: 'u-1' }) })).resolves.toEqual(
      { title: 'User detail' }
    );
  });
});
