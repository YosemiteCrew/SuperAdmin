const getUserMock = jest.fn();
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: (...a: unknown[]) => getUserMock(...a) },
}));

const createTokenMock = jest.fn();
const verifyUsingTokenMock = jest.fn();
const isEmailVerifiedMock = jest.fn();
const unverifyEmailMock = jest.fn();
jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: {
    createEmailVerificationToken: (...a: unknown[]) => createTokenMock(...a),
    verifyEmailUsingToken: (...a: unknown[]) => verifyUsingTokenMock(...a),
    isEmailVerified: (...a: unknown[]) => isEmailVerifiedMock(...a),
    unverifyEmail: (...a: unknown[]) => unverifyEmailMock(...a),
  },
}));

import { setEmailVerified } from '@/app/features/users/emailVerification';

function userWith(methods: Array<Record<string, unknown>>) {
  return { loginMethods: methods };
}

beforeEach(() => {
  getUserMock.mockReset();
  createTokenMock.mockReset().mockResolvedValue({ status: 'OK', token: 'tok' });
  verifyUsingTokenMock.mockReset().mockResolvedValue({ status: 'OK' });
  isEmailVerifiedMock.mockReset().mockResolvedValue(true);
  unverifyEmailMock.mockReset().mockResolvedValue({ status: 'OK' });
});

describe('setEmailVerified', () => {
  it('does nothing when the user does not exist', async () => {
    getUserMock.mockResolvedValue(undefined);
    await expect(setEmailVerified('ghost', true)).resolves.toBe(false);
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(unverifyEmailMock).not.toHaveBeenCalled();
  });

  it('verifies every email method by minting then consuming a token', async () => {
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: ['public'] }])
    );
    await expect(setEmailVerified('u-1', true)).resolves.toBe(true);
    expect(createTokenMock).toHaveBeenCalledWith('public', 'r1', 'a@x.com');
    expect(verifyUsingTokenMock).toHaveBeenCalledWith('public', 'tok');
  });

  it('skips verifying when the email is already verified', async () => {
    createTokenMock.mockResolvedValue({ status: 'EMAIL_ALREADY_VERIFIED_ERROR' });
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: ['public'] }])
    );
    await expect(setEmailVerified('u-1', true)).resolves.toBe(false);
    expect(verifyUsingTokenMock).not.toHaveBeenCalled();
  });

  it('reports no change when a minted token cannot be consumed', async () => {
    verifyUsingTokenMock.mockResolvedValue({ status: 'EMAIL_VERIFICATION_INVALID_TOKEN_ERROR' });
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: ['public'] }])
    );
    await expect(setEmailVerified('u-1', true)).resolves.toBe(false);
  });

  it('falls back to the default tenant when a method has none', async () => {
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: [] }])
    );
    await expect(setEmailVerified('u-1', true)).resolves.toBe(true);
    expect(createTokenMock).toHaveBeenCalledWith('public', 'r1', 'a@x.com');
  });

  it('unverifies every email method', async () => {
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: ['public'] }])
    );
    await expect(setEmailVerified('u-1', false)).resolves.toBe(true);
    expect(isEmailVerifiedMock).toHaveBeenCalledWith('r1', 'a@x.com');
    expect(unverifyEmailMock).toHaveBeenCalledWith('r1', 'a@x.com');
    expect(createTokenMock).not.toHaveBeenCalled();
  });

  it('skips an email that is already unverified', async () => {
    isEmailVerifiedMock.mockResolvedValue(false);
    getUserMock.mockResolvedValue(
      userWith([{ email: 'a@x.com', recipeUserId: 'r1', tenantIds: ['public'] }])
    );
    await expect(setEmailVerified('u-1', false)).resolves.toBe(false);
    expect(unverifyEmailMock).not.toHaveBeenCalled();
  });

  it('skips login methods that carry no email', async () => {
    getUserMock.mockResolvedValue(userWith([{ recipeUserId: 'r1', tenantIds: ['public'] }]));
    await expect(setEmailVerified('u-1', true)).resolves.toBe(false);
    expect(createTokenMock).not.toHaveBeenCalled();
  });
});
