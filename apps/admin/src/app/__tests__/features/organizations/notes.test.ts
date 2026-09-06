jest.mock('server-only', () => ({}));

const getUserMetadataMock = jest.fn();
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: (...args: unknown[]) => getUserMetadataMock(...args) },
}));

const findFirstMock = jest.fn();
const findManyMock = jest.fn();
const createManyMock = jest.fn();
const createMock = jest.fn();
const deleteManyMock = jest.fn();
const findImportMock = jest.fn();
const upsertImportMock = jest.fn();
jest.mock('@superadmin/database', () => ({
  prisma: {
    orgNote: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
      findMany: (...args: unknown[]) => findManyMock(...args),
      createMany: (...args: unknown[]) => createManyMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      deleteMany: (...args: unknown[]) => deleteManyMock(...args),
    },
    orgNoteImport: {
      findUnique: (...args: unknown[]) => findImportMock(...args),
      upsert: (...args: unknown[]) => upsertImportMock(...args),
    },
  },
}));

import { MAX_NOTES, addOrgNote, getOrgNotes } from '@/app/features/organizations/notes';

beforeEach(() => {
  jest.clearAllMocks();
  findImportMock.mockResolvedValue({ orgId: 'org-1' });
  findFirstMock.mockResolvedValue({ id: 'existing' });
  findManyMock.mockResolvedValue([]);
  getUserMetadataMock.mockResolvedValue({ metadata: {}, status: 'OK' });
});

it('reads the newest notes for one organization', async () => {
  findManyMock.mockResolvedValue([
    {
      id: 'n1',
      actorId: 'u1',
      actorEmail: 'a@b.com',
      content: 'hello',
      at: new Date(1000),
    },
  ]);
  await expect(getOrgNotes('org-1')).resolves.toEqual([
    {
      id: 'n1',
      actorId: 'u1',
      actorEmail: 'a@b.com',
      content: 'hello',
      at: 1000,
    },
  ]);
  expect(findManyMock).toHaveBeenCalledWith({
    where: { orgId: 'org-1' },
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
    take: MAX_NOTES,
  });
});

it('does not inspect legacy storage after an import is complete', async () => {
  await getOrgNotes('org-1');
  expect(findFirstMock).not.toHaveBeenCalled();
  expect(getUserMetadataMock).not.toHaveBeenCalled();
});

it('imports valid legacy notes once with their organization id', async () => {
  findImportMock.mockResolvedValue(null);
  findFirstMock.mockResolvedValue(null);
  getUserMetadataMock.mockResolvedValue({
    metadata: {
      notes: [
        { id: 'n1', actorId: 'u1', actorEmail: 'a@b.com', content: 'old', at: 1000 },
        { broken: true },
      ],
    },
    status: 'OK',
  });
  await getOrgNotes('org-legacy');
  expect(getUserMetadataMock).toHaveBeenCalledWith('superadmin:org-notes:org-legacy');
  expect(createManyMock).toHaveBeenCalledWith({
    data: [
      {
        id: 'n1',
        orgId: 'org-legacy',
        actorId: 'u1',
        actorEmail: 'a@b.com',
        content: 'old',
        at: new Date(1000),
      },
    ],
    skipDuplicates: true,
  });
  expect(upsertImportMock).toHaveBeenCalledWith({
    where: { orgId: 'org-legacy' },
    create: { orgId: 'org-legacy' },
    update: {},
  });
});

it('does not touch SuperTokens or import when rows already exist', async () => {
  findImportMock.mockResolvedValue(null);
  await getOrgNotes('org-1');
  expect(getUserMetadataMock).not.toHaveBeenCalled();
  expect(createManyMock).not.toHaveBeenCalled();
  expect(upsertImportMock).toHaveBeenCalledWith({
    where: { orgId: 'org-1' },
    create: { orgId: 'org-1' },
    update: {},
  });
});

it('marks an empty legacy import complete', async () => {
  findImportMock.mockResolvedValue(null);
  findFirstMock.mockResolvedValue(null);
  await getOrgNotes('org-empty');
  expect(getUserMetadataMock).toHaveBeenCalledTimes(1);
  expect(createManyMock).not.toHaveBeenCalled();
  expect(upsertImportMock).toHaveBeenCalledWith({
    where: { orgId: 'org-empty' },
    create: { orgId: 'org-empty' },
    update: {},
  });
});

it('inserts a trimmed note without rewriting existing notes', async () => {
  await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: '  hi  ' });
  expect(createMock).toHaveBeenCalledWith({
    data: expect.objectContaining({ orgId: 'org-1', content: 'hi' }),
  });
  expect(deleteManyMock).not.toHaveBeenCalled();
});

it('uses random bytes when randomUUID is unavailable', async () => {
  const original = globalThis.crypto.randomUUID;
  Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
  try {
    await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: 'note' });
  } finally {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { value: original, configurable: true });
  }
  expect(createMock.mock.calls[0][0].data.id).toMatch(/^[0-9a-f]{16}$/);
});

it(`deletes notes beyond the newest ${MAX_NOTES}`, async () => {
  findManyMock.mockResolvedValue([{ id: 'old-1' }, { id: 'old-2' }]);
  await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: 'new' });
  expect(findManyMock).toHaveBeenCalledWith({
    where: { orgId: 'org-1' },
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
    skip: MAX_NOTES,
    select: { id: true },
  });
  expect(deleteManyMock).toHaveBeenCalledWith({
    where: { id: { in: ['old-1', 'old-2'] } },
  });
});
