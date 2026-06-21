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

const epInitMock: jest.Mock = jest.fn(() => 'emailpassword-recipe');
jest.mock('supertokens-node/recipe/emailpassword', () => ({
  __esModule: true,
  default: { init: (...args: unknown[]) => epInitMock(...args) },
}));

jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'emailverification-recipe') },
}));

const revokeAllSessionsForUserMock = jest.fn();
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'session-recipe'),
    revokeAllSessionsForUser: (...args: unknown[]) => revokeAllSessionsForUserMock(...args),
  },
}));

const updateUserMetadataMock = jest.fn();
const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'usermetadata-recipe'),
    updateUserMetadata: (...args: unknown[]) => updateUserMetadataMock(...args),
    getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args),
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

jest.mock('supertokens-node/recipe/totp', () => ({
  __esModule: true,
  default: { init: jest.fn(() => 'totp-recipe') },
}));

jest.mock('supertokens-node/recipe/multifactorauth', () => ({
  __esModule: true,
  default: {
    init: jest.fn(() => 'mfa-recipe'),
    FactorIds: { EMAILPASSWORD: 'emailpassword', TOTP: 'totp' },
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
    accessTokenPayload: { sub: 'admin-1', 'st-mfa': { v: true } },
    hasToken: true,
    error: null,
  });
  getRolesForUserMock.mockResolvedValue({ roles: ['superadmin'] });
  getUserMock.mockResolvedValue({ emails: ['admin@example.com'] });
  createRoleMock.mockResolvedValue(undefined);
  addRoleToUserMock.mockResolvedValue(undefined);
  updateUserMetadataMock.mockResolvedValue(undefined);
  getUserMetadataMock.mockResolvedValue({ metadata: {} });
  revokeAllSessionsForUserMock.mockReset().mockResolvedValue(undefined);
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

  it('wires up the seven recipes (incl. email verification, user roles, TOTP, MFA)', () => {
    const cfg = backendConfig();
    expect(cfg.recipeList.length).toBe(7);
  });

  it('forces TOTP as the required second factor via the MFA override', async () => {
    backendConfig();
    const mfa = jest.requireMock('supertokens-node/recipe/multifactorauth') as {
      default: { init: jest.Mock };
    };
    const cfg = mfa.default.init.mock.calls.at(-1)?.[0] as {
      override: {
        functions: (orig: Record<string, unknown>) => {
          getMFARequirementsForAuth: () => Promise<string[]>;
        };
      };
    };
    const fns = cfg.override.functions({ untouched: 'original' });
    await expect(fns.getMFARequirementsForAuth()).resolves.toEqual(['totp']);
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

  it('redirects to the TOTP screen when MFA is not complete', async () => {
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: { sub: 'admin-1', 'st-mfa': { v: false } },
      hasToken: true,
      error: null,
    });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth/mfa/totp');
  });

  it('redirects to the TOTP screen when the MFA claim is absent', async () => {
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: { sub: 'admin-1' },
      hasToken: true,
      error: null,
    });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth/mfa/totp');
  });

  it('redirects to /forbidden when authenticated without the role and not allowlisted', async () => {
    getRolesForUserMock.mockResolvedValueOnce({ roles: [] });
    getUserMock.mockResolvedValueOnce({ emails: ['stranger@example.com'] });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/forbidden');
    expect(addRoleToUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth when there is no valid session', async () => {
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: null,
      hasToken: false,
      error: null,
    });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth');
    expect(getRolesForUserMock).not.toHaveBeenCalled();
  });

  it('redirects to /auth when the session has no string subject', async () => {
    getSSRSessionMock.mockResolvedValueOnce({
      accessTokenPayload: {},
      hasToken: true,
      error: null,
    });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth');
  });

  it('rejects a disabled super admin whose session is still live, revoking it', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: { disabledAt: 1700000000000 } });
    await expect(requireSuperAdmin()).rejects.toThrow('NEXT_REDIRECT:/auth');
    expect(revokeAllSessionsForUserMock).toHaveBeenCalledWith('admin-1');
  });

  it('still allows access when the disabled-status read fails (fails open)', async () => {
    getUserMetadataMock.mockRejectedValueOnce(new Error('down'));
    await expect(requireSuperAdmin()).resolves.toEqual({ userId: 'admin-1' });
    expect(revokeAllSessionsForUserMock).not.toHaveBeenCalled();
  });

  it('still denies a disabled admin when session revocation throws', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: { disabledAt: 1 } });
    revokeAllSessionsForUserMock.mockRejectedValueOnce(new Error('revoke down'));
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

  it('disables public sign-up by removing the signUpPOST endpoint', () => {
    const apis = getApis({ signUpPOST: jest.fn() });
    expect(apis.signUpPOST).toBeUndefined();
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
});

describe('EmailPassword signIn override (disabled accounts)', () => {
  function getFunctions(original: Record<string, unknown>) {
    const cfg = epInitMock.mock.calls.at(-1)?.[0] as {
      override: {
        functions: (orig: Record<string, unknown>) => {
          signIn: (input: unknown) => Promise<{ status: string }>;
        };
      };
    };
    return cfg.override.functions(original);
  }

  beforeEach(() => {
    backendConfig();
  });

  it('blocks sign-in for a disabled account', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: { disabledAt: 1700000000000 } });
    const signIn = jest.fn(async () => ({ status: 'OK', user: { id: 'u-1' } }));
    const fns = getFunctions({ signIn });
    await expect(fns.signIn({})).resolves.toEqual({ status: 'WRONG_CREDENTIALS_ERROR' });
  });

  it('allows sign-in for an enabled account', async () => {
    getUserMetadataMock.mockResolvedValueOnce({ metadata: {} });
    const signIn = jest.fn(async () => ({ status: 'OK', user: { id: 'u-2' } }));
    const fns = getFunctions({ signIn });
    await expect(fns.signIn({})).resolves.toEqual({ status: 'OK', user: { id: 'u-2' } });
  });

  it('passes through a failed sign-in without checking metadata', async () => {
    const signIn = jest.fn(async () => ({ status: 'WRONG_CREDENTIALS_ERROR' }));
    const fns = getFunctions({ signIn });
    await expect(fns.signIn({})).resolves.toEqual({ status: 'WRONG_CREDENTIALS_ERROR' });
    expect(getUserMetadataMock).not.toHaveBeenCalled();
  });

  it('retries once and allows sign-in when the first metadata read fails but the retry succeeds', async () => {
    getUserMetadataMock
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ metadata: {} });
    const signIn = jest.fn(async () => ({ status: 'OK', user: { id: 'u-3' } }));
    const fns = getFunctions({ signIn });
    await expect(fns.signIn({})).resolves.toEqual({ status: 'OK', user: { id: 'u-3' } });
  });

  it('fails closed (blocks sign-in) when metadata reads keep throwing', async () => {
    getUserMetadataMock.mockReset().mockRejectedValue(new Error('down'));
    const signIn = jest.fn(async () => ({ status: 'OK', user: { id: 'u-4' } }));
    const fns = getFunctions({ signIn });
    await expect(fns.signIn({})).resolves.toEqual({ status: 'WRONG_CREDENTIALS_ERROR' });
  });
});
