jest.mock('server-only', () => ({}));
jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { listUsersByAccountInfo: jest.fn() },
}));

import supertokens from 'supertokens-node';
import { linkEmailsToAccounts } from '@/app/features/contact/link';

const mockList = supertokens.listUsersByAccountInfo as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('linkEmailsToAccounts', () => {
  it('maps emails that match an account to userId + signup time', async () => {
    mockList.mockImplementation(async (_tenant: string, info: { email: string }) =>
      info.email === 'user@clinic.com'
        ? [{ id: 'u1', emails: ['user@clinic.com'], timeJoined: 1_700_000_000_000 }]
        : []
    );

    const map = await linkEmailsToAccounts(['user@clinic.com', 'prospect@clinic.com']);
    expect(map.get('user@clinic.com')).toEqual({ userId: 'u1', signedUpAt: 1_700_000_000_000 });
    expect(map.has('prospect@clinic.com')).toBe(false);
  });

  it('deduplicates and lowercases before lookup', async () => {
    mockList.mockResolvedValue([]);
    await linkEmailsToAccounts(['A@B.com', 'a@b.com']);
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith('public', { email: 'a@b.com' });
  });

  it('ignores a fuzzy match that is not an exact email', async () => {
    mockList.mockResolvedValue([{ id: 'u9', emails: ['other@clinic.com'], timeJoined: 1 }]);
    const map = await linkEmailsToAccounts(['target@clinic.com']);
    expect(map.size).toBe(0);
  });

  it('links when the account stores the email with different casing', async () => {
    mockList.mockResolvedValue([{ id: 'u1', emails: ['User@Clinic.com'], timeJoined: 42 }]);
    const map = await linkEmailsToAccounts(['user@clinic.com']);
    expect(map.get('user@clinic.com')).toEqual({ userId: 'u1', signedUpAt: 42 });
  });

  it('treats a lookup failure as un-linked', async () => {
    mockList.mockRejectedValue(new Error('core down'));
    const map = await linkEmailsToAccounts(['user@clinic.com']);
    expect(map.size).toBe(0);
  });
});
