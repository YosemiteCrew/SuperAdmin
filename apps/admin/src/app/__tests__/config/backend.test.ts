/**
 * @jest-environment node
 */
import { redirect } from 'next/navigation';

const initSpy = jest.fn();
const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: {
    init: (cfg: unknown) => initSpy(cfg),
    getUser: (...args: unknown[]) => getUserMock(...args),
  },
}));

const epInitMock = jest.fn((..._args: unknown[]) => 'emailpassword-recipe');
jest.mock('supertokens-node/recipe/emailpassword', () => ({
  __esModule: true,
  default: { init: (...args: unknown[]) => epInitMock(...args) },
}));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'session-recipe') },
}));

const updateUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'usermetadata-recipe'),
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
  },
}));

const getRolesForUserMock = jest.fn();
const createRoleMock = jest.fn();
const addRoleToUserMock = jest.fn();
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'userroles-recipe'),
    getRolesForUser: (...args: unknown[]) => getRolesForUserMock(...args),
    createNewRoleOrAddPermissions: (...args: unknown[]) => createRoleMock(...args),
    addRoleToUser: (...args: unknown[]) => addRoleToUserMock(...args),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ getAll: () => [] })),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const getSSRSessionMock = jest.fn();
jest.mock('supertokens-node/nextjs', () => ({
  getSSRSession: (...args: unknown[]) => getSSRSessionMock(...args),
}));

jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    supertokensConnectionUri: 'https://test',
    supertokensApiKey: 'k',
    superadminBootstrapEmails: ['admin@example.com'],
  },
}));

jest.mock('@/app/config/appInfo', () => ({
  appInfo: { appName: 'Test Admin' },
}));

import { assertSuperAdmin, backendConfig, requireSuperAdmin } from '@/app/config/backend';

const redirectMock = redirect as unknown as jest.Mock;

beforeEach(() => {
  initSpy.mockReset();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  });
  getSSRSessionMock.mockResolvedValue({
    accessTokenPayload: { sub: 'admin-1' },
    hasToken: true,
    error: null,
  });
  getRolesForUserMock.mockResolvedValue({ roles: ['superadmin'] });
  getUserMock.mockResolvedValue({ emails: ['admin@example.com'] });
  createRoleMock.mockResolvedValue(undefined);
  addRoleToUserMock.mockResolvedValue(undefined);
  updateUserMetadataMock.mockResolvedValue(undefined);
});

describe('ensureSuperTokensInit / backendConfig', () => {
  it('calls SuperTokens.init exactly once across calls', () => {
    jest.isolateModules(() => {
      const mod = jest.requireActual<typeof import('@/app/config/backend')>('@/app/config/backend');
      mod.ensureSuperTokensInit();
      mod.ensureSuperTokensInit();
      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('wires up the four recipes (incl. user roles)', () => {
    const cfg = backendConfig();
    expect(cfg.recipeList.length).toBe(4);
  });
});

describe('requireSuperAdmin', () => {
  it('returns the userId when the user already holds the superadmin role', async () => {
    const result = await requireSuperAdmin();
    expect(result).toEqual({ userId: 'admin-1' });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(addRoleToUserMock).not.toHaveBeenCalled();
  });

  it('grants the role to a bootstrap-allowlisted email then allows access', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    const result = await requireSuperAdmin();
    expect(result).toEqual({ userId: 'admin-1' });
    expect(createRoleMock).toHaveBeenCalledWith('superadmin', []);
    expect(addRoleToUserMock).toHaveBeenCalledWith('public', 'admin-1', 'superadmin');
  });

  it('matches bootstrap emails case-insensitively', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    getUserMock.mockResolvedValueOnce({ emails: ['Admin@Example.com'] });
    await expect(requireSuperAdmin()).resolves.toEqual({ userId: 'admin-1' });
    expect(addRoleToUserMock).toHaveBeenCalled();
  });

  it('redirects to /forbidden when authenticated without the role and not allowlisted', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    getUserMock.mockResolvedValueOnce({ emails: ['stranger@example.com'] });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/forbidden');
    expect(addRoleToUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth when there is no valid session', async () => {
    getSSRSessionMock.mockResolvedValueOnce({ accessTokenPayload: null, hasToken: false, error: null });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth');
    expect(getRolesForUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth when the session has no string subject', async () => {
    getSSRSessionMock.mockResolvedValueOnce({ accessTokenPayload: {}, hasToken: true, error: null });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth');
  });
});

describe('assertSuperAdmin', () => {
  it('resolves for a super admin', async () => {
    await expect(assertSuperAdmin('admin-1')).resolves.toBeUndefined();
  });

  it('redirects to /forbidden for a non-admin', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    getUserMock.mockResolvedValueOnce({ emails: ['stranger@example.com'] });
    await expect(assertSuperAdmin('user-9')).rejects.toThrow('NEXT_REDIRECT:/forbidden');
  });

  it('treats a user with no email as not authorized', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    getUserMock.mockResolvedValueOnce(undefined);
    await expect(assertSuperAdmin('ghost')).rejects.toThrow('NEXT_REDIRECT:/forbidden');
  });
});

describe('backendConfig sign-in/sign-up overrides', () => {
  function getApis(original: Record<string, unknown>) {
    const cfg = epInitMock.mock.calls.at(-1)?.[0] as {
      override: {
        apis: (
          orig: Record<string, unknown>
        ) => Record<string, (input: unknown) => Promise<unknown>>;
      };
    };
    return cfg.override.apis(original);
  }

  beforeEach(() => {
    backendConfig();
  });

  it('records last sign-in on a successful sign-in', async () => {
    const signInPOST = jest.fn(async () => ({ status: 'OK', user: { id: 'u-1' } }));
    const apis = getApis({ signInPOST });
    await apis.signInPOST({});
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ lastSignInAt: expect.any(Number) })
    );
  });

  it('records last sign-in on a successful sign-up', async () => {
    const signUpPOST = jest.fn(async () => ({ status: 'OK', user: { id: 'u-2' } }));
    const apis = getApis({ signUpPOST });
    await apis.signUpPOST({});
    expect(updateUserMetadataMock).toHaveBeenCalledWith(
      'u-2',
      expect.objectContaining({ lastSignInAt: expect.any(Number) })
    );
  });

  it('does not record metadata when sign-in is not OK', async () => {
    const signInPOST = jest.fn(async () => ({ status: 'WRONG_CREDENTIALS_ERROR' }));
    const apis = getApis({ signInPOST });
    await apis.signInPOST({});
    expect(updateUserMetadataMock).not.toHaveBeenCalled();
  });

  it('still succeeds when the metadata write fails', async () => {
    updateUserMetadataMock.mockRejectedValueOnce(new Error('boom'));
    const signInPOST = jest.fn(async () => ({ status: 'OK', user: { id: 'u-3' } }));
    const apis = getApis({ signInPOST });
    await expect(apis.signInPOST({})).resolves.toEqual({ status: 'OK', user: { id: 'u-3' } });
  });

  it('throws when the original sign-in implementation is disabled', async () => {
    const apis = getApis({});
    await expect(apis.signInPOST({})).rejects.toThrow('signInPOST is disabled');
  });

  it('throws when the original sign-up implementation is disabled', async () => {
    const apis = getApis({});
    await expect(apis.signUpPOST({})).rejects.toThrow('signUpPOST is disabled');
  });
});
