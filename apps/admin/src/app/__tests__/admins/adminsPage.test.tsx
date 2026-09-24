import { render, screen, within } from '@testing-library/react';

const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...a: unknown[]) => getUserMock(...a) },
}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(async () => ({ metadata: {} })) },
}));

jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { listDevices: jest.fn(async () => ({ status: 'OK', devices: [] })) },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    getUsersThatHaveRole: jest.fn(async () => ({ status: 'OK', users: ['admin-1', 'boot-1'] })),
  },
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(async () => ({ userId: 'admin-1' })),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: { superadminBootstrapEmails: ['boot@example.com'] },
}));

jest.mock('@/app/(routes)/(dashboard)/admins/actions', () => ({
  revokeAdminAction: jest.fn(),
}));

function account(id: string, email: string, verified: boolean) {
  return { id, emails: [email], loginMethods: [{ email, verified }] };
}

async function renderWithBootstrapAccount(verified: boolean) {
  getUserMock.mockImplementation(async (id: string) =>
    id === 'boot-1'
      ? account('boot-1', 'boot@example.com', verified)
      : account('admin-1', 'admin@example.com', true)
  );
  const { default: AdminsPage } = await import('@/app/(routes)/(dashboard)/admins/page');
  render(await AdminsPage());
  return screen.getByText('boot@example.com').closest('tr') as HTMLElement;
}

describe('AdminsPage bootstrap label', () => {
  it('shields a confirmed bootstrap account and offers no revoke', async () => {
    const row = await renderWithBootstrapAccount(true);

    expect(
      within(row).getByTitle('Bootstrap admin, protected from revocation')
    ).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });

  it('treats an unconfirmed account on a bootstrap email like any other admin', async () => {
    const row = await renderWithBootstrapAccount(false);

    expect(
      within(row).queryByTitle('Bootstrap admin, protected from revocation')
    ).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });
});
