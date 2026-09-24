const getUserMock = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...args: unknown[]) => getUserMock(...args) },
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

function account(email: string, { id = 'user-1', verified = true } = {}): TestUser {
  return {
    id,
    emails: [email],
    loginMethods: [{ email, verified }],
  } as unknown as TestUser;
}

describe('bootstrap admin protection', () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it('matches configured bootstrap emails case-insensitively', () => {
    expect(isBootstrapAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(isBootstrapAdminEmail('user@example.com')).toBe(false);
    expect(isBootstrapAdminEmail(undefined)).toBe(false);
  });

  describe('hasVerifiedBootstrapEmail', () => {
    it('accepts a confirmed bootstrap email', () => {
      expect(hasVerifiedBootstrapEmail(account('ADMIN@EXAMPLE.COM'))).toBe(true);
    });

    it('rejects a bootstrap email that is not confirmed', () => {
      expect(hasVerifiedBootstrapEmail(account('admin@example.com', { verified: false }))).toBe(
        false
      );
    });

    it('rejects a bootstrap email that no sign-in method carries', () => {
      const user = {
        emails: ['admin@example.com'],
        loginMethods: [{ email: 'other@example.com', verified: true }],
      } as unknown as TestUser;
      expect(hasVerifiedBootstrapEmail(user)).toBe(false);
    });

    it('rejects an ordinary or missing account', () => {
      expect(hasVerifiedBootstrapEmail(account('user@example.com'))).toBe(false);
      expect(hasVerifiedBootstrapEmail(undefined)).toBe(false);
    });
  });

  describe('canOfferUserDeletion', () => {
    it('offers deletion for an ordinary account other than the actor', () => {
      expect(canOfferUserDeletion(account('user@example.com'), 'actor-1')).toBe(true);
    });

    it('never offers deleting the actor', () => {
      expect(canOfferUserDeletion(account('user@example.com', { id: 'actor-1' }), 'actor-1')).toBe(
        false
      );
    });

    it('protects a confirmed bootstrap account', () => {
      expect(canOfferUserDeletion(account('ADMIN@EXAMPLE.COM'), 'actor-1')).toBe(false);
    });

    it('offers deletion for an unconfirmed account on a bootstrap email', () => {
      expect(
        canOfferUserDeletion(account('admin@example.com', { verified: false }), 'actor-1')
      ).toBe(true);
    });
  });

  describe('isBootstrapAdmin', () => {
    it('protects a user whose confirmed primary email is configured', async () => {
      getUserMock.mockResolvedValue(account('ADMIN@EXAMPLE.COM'));
      await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
    });

    it('does not protect an unconfirmed account on a bootstrap email', async () => {
      getUserMock.mockResolvedValue(account('admin@example.com', { verified: false }));
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
  });

  describe('isConfirmedBootstrapAdmin', () => {
    it('only confirms a bootstrap safety anchor after a successful lookup', async () => {
      getUserMock.mockResolvedValueOnce(account('ADMIN@EXAMPLE.COM'));
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(true);

      getUserMock.mockRejectedValueOnce(new Error('unavailable'));
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(false);
    });

    it('does not count an unconfirmed account on a bootstrap email', async () => {
      getUserMock.mockResolvedValue(account('admin@example.com', { verified: false }));
      await expect(isConfirmedBootstrapAdmin('user-1')).resolves.toBe(false);
    });
  });
});
