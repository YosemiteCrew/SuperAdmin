jest.mock('server-only', () => ({}));

const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args) },
}));

const findManyMock = jest.fn();
const createMock = jest.fn();
const createManyMock = jest.fn();
const deleteManyMock = jest.fn();
const updateManyMock = jest.fn();
const findImportMock = jest.fn();
const upsertImportMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: {
    invite: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      createMany: (...args: unknown[]) => createManyMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
    },
    inviteImport: {
      findUnique: (...args: unknown[]) => findImportMock(...args),
      upsert: (...args: unknown[]) => upsertImportMock(...args),
    },
  },
}));

import {
  INVITE_TTL_MS,
  createInvite,
  getInviteByToken,
  getInvites,
  markInviteUsed,
  revokeInvite,
} from '@/app/features/invites/store';

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'i1',
    token: 'tok1',
    email: 'a@b.com',
    createdBy: 'u1',
    createdByEmail: 'a@b.com',
    createdAt: new Date(1000),
    expiresAt: new Date(2000),
    usedAt: null,
    usedBy: null,
    usedByEmail: null,
    revokedAt: null,
    revokedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  findImportMock.mockResolvedValue({ id: 'invites' });
  findManyMock.mockResolvedValue([]);
  createManyMock.mockResolvedValue({ count: 0 });
  deleteManyMock.mockResolvedValue({ count: 0 });
  updateManyMock.mockResolvedValue({ count: 0 });
  getUserMetadataMock.mockResolvedValue({ metadata: {}, status: 'OK' });
});

describe('getInvites', () => {
  it('returns the newest 50 as InviteRecord (Date -> epoch ms)', async () => {
    findManyMock.mockResolvedValue([makeRow()]);
    const invites = await getInvites();
    expect(invites).toEqual([
      {
        id: 'i1',
        token: 'tok1',
        email: 'a@b.com',
        createdBy: 'u1',
        createdByEmail: 'a@b.com',
        createdAt: 1000,
        expiresAt: 2000,
      },
    ]);
    expect(findManyMock).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
  });

  it('does not touch legacy storage once the import marker exists', async () => {
    await getInvites();
    expect(getUserMetadataMock).not.toHaveBeenCalled();
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it('includes usedAt/usedBy/revokedAt/revokedBy only when the row set them', async () => {
    findManyMock.mockResolvedValue([
      makeRow({
        usedAt: new Date(3000),
        usedBy: 'u2',
        usedByEmail: 'b@b.com',
        revokedAt: new Date(4000),
        revokedBy: 'admin1',
      }),
    ]);
    const [invite] = await getInvites();
    expect(invite).toMatchObject({
      usedAt: 3000,
      usedBy: 'u2',
      usedByEmail: 'b@b.com',
      revokedAt: 4000,
      revokedBy: 'admin1',
    });
  });
});

describe('legacy import', () => {
  it('imports valid legacy invites once, skipping malformed entries', async () => {
    findImportMock.mockResolvedValue(null);
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        invites: [
          {
            id: 'legacy-1',
            token: 'legacy-tok',
            email: 'legacy@b.com',
            createdBy: 'u1',
            createdByEmail: 'a@b.com',
            createdAt: 1000,
            expiresAt: 2000,
          },
          { broken: true },
          null,
          'string',
        ],
      },
      status: 'OK',
    });

    await getInvites();

    expect(getUserMetadataMock).toHaveBeenCalledWith('superadmin:invites');
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        {
          id: 'legacy-1',
          token: 'legacy-tok',
          email: 'legacy@b.com',
          createdBy: 'u1',
          createdByEmail: 'a@b.com',
          createdAt: new Date(1000),
          expiresAt: new Date(2000),
          usedAt: null,
          usedBy: null,
          usedByEmail: null,
          revokedAt: null,
          revokedBy: null,
        },
      ],
      skipDuplicates: true,
    });
    expect(upsertImportMock).toHaveBeenCalledWith({
      where: { id: 'invites' },
      create: { id: 'invites' },
      update: {},
    });
  });

  it('carries over usedAt/usedBy/revokedAt/revokedBy from a legacy invite', async () => {
    findImportMock.mockResolvedValue(null);
    getUserMetadataMock.mockResolvedValue({
      metadata: {
        invites: [
          {
            id: 'legacy-2',
            token: 'legacy-tok-2',
            email: 'legacy2@b.com',
            createdBy: 'u1',
            createdByEmail: 'a@b.com',
            createdAt: 1000,
            expiresAt: 2000,
            usedAt: 1500,
            usedBy: 'u2',
            usedByEmail: 'b@b.com',
            revokedAt: 1600,
            revokedBy: 'admin1',
          },
        ],
      },
      status: 'OK',
    });

    await getInvites();

    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          usedAt: new Date(1500),
          usedBy: 'u2',
          usedByEmail: 'b@b.com',
          revokedAt: new Date(1600),
          revokedBy: 'admin1',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('marks an empty legacy store imported without calling createMany', async () => {
    findImportMock.mockResolvedValue(null);
    await getInvites();
    expect(createManyMock).not.toHaveBeenCalled();
    expect(upsertImportMock).toHaveBeenCalledWith({
      where: { id: 'invites' },
      create: { id: 'invites' },
      update: {},
    });
  });

  it('re-running the import after rows already exist is a skipDuplicates no-op, not a duplicate row', async () => {
    // Simulates two concurrent callers both observing "not yet imported": the
    // second one's createMany must not error or double the row, which is what
    // skipDuplicates guarantees against the id primary key.
    findImportMock.mockResolvedValue(null);
    getUserMetadataMock.mockResolvedValue({
      metadata: { invites: [{ ...makeRow(), createdAt: 1000, expiresAt: 2000 }] },
      status: 'OK',
    });
    await getInvites();
    await getInvites();
    expect(createManyMock).toHaveBeenCalledTimes(2);
    for (const call of createManyMock.mock.calls) {
      expect(call[0].skipDuplicates).toBe(true);
    }
  });
});

describe('getInviteByToken', () => {
  it('finds an invite by token', async () => {
    findManyMock.mockResolvedValue([makeRow({ token: 'secret-token' })]);
    const found = await getInviteByToken('secret-token');
    expect(found?.email).toBe('a@b.com');
  });

  it('returns null for an unknown token', async () => {
    findManyMock.mockResolvedValue([makeRow({ token: 'other-token' })]);
    expect(await getInviteByToken('no-such-token')).toBeNull();
  });
});

describe('createInvite', () => {
  it('generates an invite with id, token, and correct TTL via a single create', async () => {
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => data);
    const before = Date.now();
    const invite = await createInvite({
      email: 'new@admin.com',
      createdBy: 'u1',
      createdByEmail: 'creator@admin.com',
    });
    const after = Date.now();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(typeof invite.id).toBe('string');
    expect(typeof invite.token).toBe('string');
    expect(invite.id).not.toBe(invite.token);
    expect(invite.email).toBe('new@admin.com');
    expect(invite.expiresAt - invite.createdAt).toBe(INVITE_TTL_MS);
    expect(invite.createdAt).toBeGreaterThanOrEqual(before);
    expect(invite.createdAt).toBeLessThanOrEqual(after);
  });

  it('uses random bytes when randomUUID is unavailable', async () => {
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => data);
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });
    try {
      const invite = await createInvite({
        email: 'a@b.com',
        createdBy: 'u1',
        createdByEmail: 'u1@b.com',
      });
      expect(invite.id).toMatch(/^[0-9a-f]{32}$/);
      expect(invite.token).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: original,
        configurable: true,
      });
    }
  });

  it('does not read the existing list before writing (no lost-update window)', async () => {
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => data);
    await createInvite({ email: 'a@b.com', createdBy: 'u1', createdByEmail: 'u1@b.com' });
    // The old implementation read the full array before every write, which is
    // exactly the race #469 reports. A single `create` call with no preceding
    // `findMany` in this flow is what removes that window.
    expect(findManyMock).toHaveBeenCalledTimes(1); // only the retention-trim query
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, select: { id: true } })
    );
  });

  it('trims invites beyond the newest 50 by deleting the stale tail', async () => {
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => data);
    findManyMock.mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]);
    await createInvite({ email: 'a@b.com', createdBy: 'u1', createdByEmail: 'u1@b.com' });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: { in: ['old-1', 'old-2'] } } });
  });

  it('does not delete when nothing is beyond the retention window', async () => {
    createMock.mockImplementation(({ data }: { data: Record<string, unknown> }) => data);
    findManyMock.mockResolvedValue([]);
    await createInvite({ email: 'a@b.com', createdBy: 'u1', createdByEmail: 'u1@b.com' });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});

describe('markInviteUsed', () => {
  it('conditions the transition on the row still being unused and unrevoked', async () => {
    await markInviteUsed({ token: 'tok1', usedBy: 'u2', usedByEmail: 'b@b.com' });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { token: 'tok1', usedAt: null, revokedAt: null },
      data: {
        usedAt: expect.any(Date),
        usedBy: 'u2',
        usedByEmail: 'b@b.com',
      },
    });
  });

  it('is a no-op at the database level when a concurrent revoke already landed (0 rows matched)', async () => {
    // A revoke that completed first turns `revokedAt` non-null, so this
    // WHERE clause matches 0 rows and updateMany reports count 0 — the used
    // state that would have overwritten it never gets written. Removing the
    // `revokedAt: null` predicate is exactly the regression #469 describes:
    // this call would then match and silently un-revoke the invite.
    updateManyMock.mockResolvedValue({ count: 0 });
    await expect(
      markInviteUsed({ token: 'tok1', usedBy: 'u2', usedByEmail: 'b@b.com' })
    ).resolves.toBeUndefined();
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }) })
    );
  });
});

describe('revokeInvite', () => {
  it('conditions the transition on the row being unused, unrevoked, and unexpired', async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    const changed = await revokeInvite({ inviteId: 'i1', revokedBy: 'admin1' });
    expect(changed).toBe(true);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 'i1', usedAt: null, revokedAt: null, expiresAt: { gt: expect.any(Date) } },
      data: { revokedAt: expect.any(Date), revokedBy: 'admin1' },
    });
  });

  it('returns false when the conditional update matches no row (already used, revoked, expired, or missing)', async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    await expect(revokeInvite({ inviteId: 'i1', revokedBy: 'admin1' })).resolves.toBe(false);
  });
});
