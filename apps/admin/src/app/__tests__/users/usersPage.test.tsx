import { render, screen } from '@testing-library/react';

const requireSuperAdminMock = jest.fn();
jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: (...a: unknown[]) => requireSuperAdminMock(...a),
}));

const getUsersNewestFirstMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUsersNewestFirst: (...a: unknown[]) => getUsersNewestFirstMock(...a) },
}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn(async () => ({ metadata: {} })) },
}));

jest.mock('@/app/features/users/bootstrap', () => ({
  canOfferUserDeletion: jest.fn(async () => false),
}));

// The export button and the table each import a server-action module, and those
// pull `next/cache` into a jsdom worker with no TextEncoder. Stubbed at the
// action modules rather than at the components, so the real UsersTable renders:
// the methods column is the thing under test and it lives there.
jest.mock('@/app/(routes)/(dashboard)/users/actions', () => ({
  exportUsersAction: jest.fn(),
}));

jest.mock('@/app/(routes)/(dashboard)/users/bulkActions', () => ({
  bulkDisableUsersAction: jest.fn(),
  bulkEnableUsersAction: jest.fn(),
  bulkDeleteUsersAction: jest.fn(),
}));

async function renderPage() {
  const mod = await import('@/app/(routes)/(dashboard)/users/page');
  render(await mod.default({ searchParams: Promise.resolve({}) }));
}

function user(recipeIds: string[]) {
  return {
    id: 'u-1',
    emails: ['user@example.com'],
    loginMethods: recipeIds.map((recipeId) => ({ recipeId })),
    tenantIds: ['public'],
    timeJoined: 1_700_000_000_000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  requireSuperAdminMock.mockResolvedValue({ userId: 'admin-1' });
});

describe('UsersPage login methods column', () => {
  /**
   * The column joined raw SuperTokens recipe ids, so the directory read
   * `emailpassword` for every business account. The page is where the mapping
   * happens - UsersTable receives a prepared string - so this is the only place
   * it can be asserted end to end.
   */
  it('names known recipes in words', async () => {
    getUsersNewestFirstMock.mockResolvedValue({
      users: [user(['emailpassword', 'passwordless'])],
      nextPaginationToken: undefined,
    });

    await renderPage();

    expect(screen.getByText('Email and password, One-time code')).toBeInTheDocument();
    expect(screen.queryByText(/emailpassword/)).not.toBeInTheDocument();
  });

  it('shows a recipe it does not know as its raw id', async () => {
    getUsersNewestFirstMock.mockResolvedValue({
      users: [user(['webauthn'])],
      nextPaginationToken: undefined,
    });

    await renderPage();

    expect(screen.getByText('webauthn')).toBeInTheDocument();
  });
});
