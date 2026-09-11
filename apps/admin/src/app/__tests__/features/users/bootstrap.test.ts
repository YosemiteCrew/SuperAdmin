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
  isBootstrapAdmin,
  isBootstrapAdminEmail,
} from '@/app/features/users/bootstrap';

describe('bootstrap admin protection', () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it('matches configured bootstrap emails case-insensitively', () => {
    expect(isBootstrapAdminEmail('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(isBootstrapAdminEmail('user@example.com')).toBe(false);
    expect(isBootstrapAdminEmail(undefined)).toBe(false);
  });

  it('offers deletion only for an ordinary account other than the actor', () => {
    expect(canOfferUserDeletion('user-1', 'user@example.com', 'actor-1')).toBe(true);
    expect(canOfferUserDeletion('actor-1', 'user@example.com', 'actor-1')).toBe(false);
    expect(canOfferUserDeletion('user-1', 'ADMIN@EXAMPLE.COM', 'actor-1')).toBe(false);
  });

  it('protects a user whose primary email is configured', async () => {
    getUserMock.mockResolvedValue({ emails: ['ADMIN@EXAMPLE.COM'] });
    await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
  });

  it('does not protect an ordinary user', async () => {
    getUserMock.mockResolvedValue({ emails: ['user@example.com'] });
    await expect(isBootstrapAdmin('user-1')).resolves.toBe(false);
  });

  it('fails closed when the account lookup fails', async () => {
    getUserMock.mockRejectedValue(new Error('unavailable'));
    await expect(isBootstrapAdmin('user-1')).resolves.toBe(true);
  });
});
