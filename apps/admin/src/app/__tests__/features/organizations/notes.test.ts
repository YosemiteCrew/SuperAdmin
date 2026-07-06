jest.mock('server-only', () => ({}));

jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: {
    getUserMetadata: jest.fn(),
    updateUserMetadata: jest.fn(),
  },
}));

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import { MAX_NOTES, addOrgNote, getOrgNotes } from '@/app/features/organizations/notes';

const mockGet = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockUpdate = UserMetadataNode.updateUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.updateUserMetadata
>;

beforeEach(() => jest.clearAllMocks());

describe('getOrgNotes', () => {
  it('returns empty array when no metadata exists', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    expect(await getOrgNotes('org-1')).toEqual([]);
  });

  it('returns notes when stored', async () => {
    const stored = [{ id: 'n1', actorId: 'u1', actorEmail: 'a@b.com', content: 'hello', at: 1000 }];
    mockGet.mockResolvedValue({ metadata: { notes: stored }, status: 'OK' });
    const notes = await getOrgNotes('org-1');
    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe('hello');
  });

  it('filters out malformed note entries', async () => {
    mockGet.mockResolvedValue({
      metadata: {
        notes: [
          { id: 'n1', actorId: 'u1', actorEmail: 'a@b.com', content: 'ok', at: 1000 },
          { broken: true },
          null,
          42,
        ],
      },
      status: 'OK',
    });
    const notes = await getOrgNotes('org-1');
    expect(notes).toHaveLength(1);
  });

  it('uses a per-org storage key', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    await getOrgNotes('org-xyz');
    expect(mockGet).toHaveBeenCalledWith('superadmin:org-notes:org-xyz');
  });
});

describe('addOrgNote', () => {
  it('prepends a new note and saves', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: 'my note' });

    const [, payload] = mockUpdate.mock.calls[0];
    const notes = (payload as Record<string, unknown>).notes as unknown[];
    expect(notes).toHaveLength(1);
    expect((notes[0] as Record<string, unknown>).content).toBe('my note');
  });

  it('trims whitespace from content', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: '  hi  ' });

    const [, payload] = mockUpdate.mock.calls[0];
    const notes = (payload as Record<string, unknown>).notes as unknown[];
    expect((notes[0] as Record<string, unknown>).content).toBe('hi');
  });

  it('generates an id via the CSPRNG fallback when randomUUID is unavailable', async () => {
    mockGet.mockResolvedValue({ metadata: {}, status: 'OK' });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    const original = globalThis.crypto.randomUUID;
    // Force the getRandomValues fallback path in generateId.
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
    });
    try {
      await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: 'x' });
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: original,
        configurable: true,
      });
    }

    const [, payload] = mockUpdate.mock.calls[0];
    const notes = (payload as Record<string, unknown>).notes as unknown[];
    const id = (notes[0] as Record<string, unknown>).id as string;
    // 8 bytes -> 16 lowercase hex chars.
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it(`caps the list at MAX_NOTES (${MAX_NOTES})`, async () => {
    const existing = Array.from({ length: MAX_NOTES }, (_, i) => ({
      id: `n${i}`,
      actorId: 'u1',
      actorEmail: 'a@b.com',
      content: `note ${i}`,
      at: i,
    }));
    mockGet.mockResolvedValue({ metadata: { notes: existing }, status: 'OK' });
    mockUpdate.mockResolvedValue({ status: 'OK', metadata: {} });

    await addOrgNote({ orgId: 'org-1', actorId: 'u1', actorEmail: 'a@b.com', content: 'new' });

    const [, payload] = mockUpdate.mock.calls[0];
    const saved = (payload as Record<string, unknown>).notes as unknown[];
    expect(saved).toHaveLength(MAX_NOTES);
    expect((saved[0] as Record<string, unknown>).content).toBe('new');
  });
});
