jest.mock('server-only', () => ({}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: jest.fn(),
    updateUserMetadata: jest.fn(),
  },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import {
  INVITE_TTL_MS,
  createInvite,
  getInviteByToken,
  getInvites,
  markInviteUsed,
  revokeInvite,
} from '@/app/features/invites/store';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

const OK_META = { status: 'OK' as const, metadata: {} };

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(OK_META);
  mockUpdate.mockResolvedValue(OK_META);
});

describe('getInvites', () => {
  it('returns empty array when no data stored', async () => {
    expect(await getInvites()).toEqual([]);
  });

  it('returns stored invites', async () => {
    const stored = [
      {
        id: 'i1',
        token: 't1',
        email: 'a@b.com',
        createdBy: 'u1',
        createdByEmail: 'a@b.com',
        createdAt: 1000,
        expiresAt: 2000,
      },
    ];
    mockGet.mockResolvedValue({ status: 'OK', metadata: { invites: stored } });
    const invites = await getInvites();
    expect(invites).toHaveLength(1);
    expect(invites[0].email).toBe('a@b.com');
  });

  it('filters out malformed entries', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: { invites: [{ broken: true }, null, 'string'] },
    });
    expect(await getInvites()).toHaveLength(0);
  });
});

describe('createInvite', () => {
  it('generates an invite with id, token, and correct TTL', async () => {
    const before = Date.now();
    const invite = await createInvite({
      email: 'new@admin.com',
      createdBy: 'u1',
      createdByEmail: 'creator@admin.com',
    });
    const after = Date.now();

    expect(typeof invite.id).toBe('string');
    expect(typeof invite.token).toBe('string');
    expect(invite.id).not.toBe(invite.token);
    expect(invite.email).toBe('new@admin.com');
    expect(invite.expiresAt - invite.createdAt).toBe(INVITE_TTL_MS);
    expect(invite.createdAt).toBeGreaterThanOrEqual(before);
    expect(invite.createdAt).toBeLessThanOrEqual(after);
  });

  it('prepends the new invite to the list', async () => {
    const existing = [
      {
        id: 'i1',
        token: 't1',
        email: 'old@b.com',
        createdBy: 'u1',
        createdByEmail: 'a@b.com',
        createdAt: 1000,
        expiresAt: 2000,
      },
    ];
    mockGet.mockResolvedValue({ status: 'OK', metadata: { invites: existing } });

    await createInvite({ email: 'new@b.com', createdBy: 'u1', createdByEmail: 'a@b.com' });

    const [, payload] = mockUpdate.mock.calls[0];
    const saved = (payload as Record<string, unknown>).invites as unknown[];
    expect(saved).toHaveLength(2);
    expect((saved[0] as Record<string, unknown>).email).toBe('new@b.com');
  });
});

describe('getInviteByToken', () => {
  it('finds invite by token', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        invites: [
          {
            id: 'i1',
            token: 'secret-token',
            email: 'a@b.com',
            createdBy: 'u1',
            createdByEmail: 'a@b.com',
            createdAt: 1000,
            expiresAt: 9999999999999,
          },
        ],
      },
    });
    const found = await getInviteByToken('secret-token');
    expect(found?.email).toBe('a@b.com');
  });

  it('returns null for unknown token', async () => {
    expect(await getInviteByToken('no-such-token')).toBeNull();
  });
});

describe('markInviteUsed', () => {
  it('sets usedAt, usedBy, usedByEmail on the matching invite', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        invites: [
          {
            id: 'i1',
            token: 'tok1',
            email: 'a@b.com',
            createdBy: 'u1',
            createdByEmail: 'a@b.com',
            createdAt: 1000,
            expiresAt: 2000,
          },
        ],
      },
    });
    await markInviteUsed({ token: 'tok1', usedBy: 'u2', usedByEmail: 'b@b.com' });

    const [, payload] = mockUpdate.mock.calls[0];
    const invites = (payload as Record<string, unknown>).invites as Record<string, unknown>[];
    expect(invites[0].usedBy).toBe('u2');
    expect(invites[0].usedByEmail).toBe('b@b.com');
    expect(typeof invites[0].usedAt).toBe('number');
  });
});

describe('revokeInvite', () => {
  it('sets revokedAt and revokedBy on matching invite', async () => {
    mockGet.mockResolvedValue({
      status: 'OK',
      metadata: {
        invites: [
          {
            id: 'i1',
            token: 'tok1',
            email: 'a@b.com',
            createdBy: 'u1',
            createdByEmail: 'a@b.com',
            createdAt: 1000,
            expiresAt: 2000,
          },
        ],
      },
    });
    await revokeInvite({ inviteId: 'i1', revokedBy: 'admin1' });

    const [, payload] = mockUpdate.mock.calls[0];
    const invites = (payload as Record<string, unknown>).invites as Record<string, unknown>[];
    expect(typeof invites[0].revokedAt).toBe('number');
    expect(invites[0].revokedBy).toBe('admin1');
  });
});
