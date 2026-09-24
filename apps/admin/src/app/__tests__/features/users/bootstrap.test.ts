const getUserMock = jest.fn();
const isEmailVerifiedMock = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...args: unknown[]) => getUserMock(...args) },
}));
jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: { isEmailVerified: (...args: unknown[]) => isEmailVerifiedMock(...args) },
}));
jest.mock('@/app/config/env.server', () => ({
  serverEnv: { superadminBootstrapEmails: ['admin@example.com'] },
}));

import {
  canOfferUserDeletion,
  hasVerifiedBootstrapEmail,
  isBootstrapAdmin,
  isBootstrapAdminEmail,
  isConfirmedBootstrapAdmin,
} from '@/app/features/users/bootstrap';

type TestUser = Parameters<typeof canOfferUserDeletion>[0];

function account(email: string, id = 'user-1'): TestUser {
  return {
    id,
    emails: [email],
    loginMethods: [{ email, recipeUserId: `recipe-${id}` }],
  } as unknown as TestUser;
}

describe('bootstrap admin protection', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    isEmailVerifiedMock.mockReset().mockResolvedValue(true);
  });

  it('matches configured bootstrap emails case-insensitively', () => {
    expect(isBootstrapAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(isBootstrapAdminEmail('user@example.com')).toBe(false);
    expect(isBootstrapAdminEmail(undefined)).toBe(false);
  });

  describe('hasVerifiedBootstrapEmail', () => {
    it('accepts a confirmed bootstrap email', async () => {
      await expect(hasVerifiedBootstrapEmail(account('ADMIN@EXAMPLE.COM'))).resolves.toBe(true);
      expect(isEmailVerifiedMock).toHaveBeenCalledWith('recipe-user-1', 'ADMIN@EXAMPLE.COM');
    });

    it('rejects a bootstrap email that is not confirmed', async () => {
      isEmailVerifiedMock.mockResolvedValue(false);
      await expect(hasVerifiedBootstrapEmail(account('admin@example.com'))).resolves.toBe(false);
    });

    it('rejects a bootstrap email that no sign-in method carries', async () => {
      const user = { emails: ['admin@example.com'], loginMethods: [] } as unknown as TestUser;
      await expect(hasVerifiedBootstrapEmail(user)).resolves.toBe(false);
      expect(isEmailVerifiedMock).not.toHaveBeenCalled();
    });

    it('does not look up an ordinary or missing account', async () => {
      await expect(hasVerifiedBootstrapEmail(account('user@example.com'))).resolves.toBe(false);
      await expect(hasVerifiedBootstrapEmail(undefined)).resolves.toBe(false);
      expect(isEmailVerifiedMock).not.toHaveBeenCalled();
    });
  });

  describe('canOfferUserDeletion', () => {
    it('offers deletion for an ordinary account other than the actor', async () => {
      await expect(canOfferUserDeletion(account('user@example.com'), 'actor-1')).resolves.toBe(
        true
      );
    });

    it('never offers deleting the actor', async () => {
      await expect(
        canOfferUserDeletion(account('user@example.com', 'actor-1'), 'actor-1')
      ).resolves.toBe(false);
    });

    it('protects a confirmed bootstrap account', async () => {
      await expect(canOfferUserDeletion(account('ADMIN@EXAMPLE.COM'), 'actor-1')).resolves.toBe(
        false
      );
    });

    it('offers deletion for an unconfirmed account on a bootstrap email', async () => {
      isEmailVerifiedMock.mockResolvedValue(false);
      await expect(canOfferUserDeletion(account('admin@example.com'), 'actor-1')).resolves.toBe(
        true
      );
    });

    it('does not offer deletion when the check fails', async () => {
      isEmailVerifiedMock.mockRejectedValue(new Error('unavailable'));
      await expect(canOfferUserDeletion(account('admin@example.com'), 'actor-1')).resolves.toBe(
        false
      );
    });
  });

  describe('isBootstrapAdmin', () => {
    it('protects a user whose confirmed primary email is configured', async () => {
      getUserMock.mockResolvedValue(account('ADMIN@EXAMPLE.COM'));
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
    });

    it('does not protect an unconfirmed account on a bootstrap email', async () => {
      getUserMock.mockResolvedValue(account('admin@example.com'));
      isEmailVerifiedMock.mockResolvedValue(false);
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(false);
    });

    it('does not protect an ordinary user', async () => {
      getUserMock.mockResolvedValue(account('user@example.com'));
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(false);
    });

    it('fails closed when the account lookup fails', async () => {
      getUserMock.mockRejectedValue(new Error('unavailable'));
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
    });

    it('fails closed when the verification check fails', async () => {
      getUserMock.mockResolvedValue(account('admin@example.com'));
      isEmailVerifiedMock.mockRejectedValue(new Error('unavailable'));
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
    });
  });

  describe('isConfirmedBootstrapAdmin', () => {
    it('only confirms a bootstrap safety anchor after a successful lookup', async () => {
      getUserMock.mockResolvedValueOnce(account('ADMIN@EXAMPLE.COM'));
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(true);

      getUserMock.mockRejectedValueOnce(new Error('unavailable'));
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(false);
    });

    it('does not count an unconfirmed account on a bootstrap email', async () => {
      getUserMock.mockResolvedValue(account('admin@example.com'));
      isEmailVerifiedMock.mockResolvedValue(false);
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(false);
    });
  });
});
