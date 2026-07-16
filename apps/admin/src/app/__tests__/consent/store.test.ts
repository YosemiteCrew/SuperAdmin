jest.mock('server-only', () => ({}));
jest.mock('@superadmin/database', () => ({
  prisma: {
    consentSubject: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    consentEvent: { createMany: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
  },
}));

import { prisma } from '@superadmin/database';
import { getSubjectDetail, listConsentSubjects, recordConsent } from '@/app/features/consent/store';

const mockUpsert = prisma.consentSubject.upsert as jest.Mock;
const mockSubjUpdateMany = prisma.consentSubject.updateMany as jest.Mock;
const mockSubjFind = prisma.consentSubject.findMany as jest.Mock;
const mockSubjUnique = prisma.consentSubject.findUnique as jest.Mock;
const mockCreateMany = prisma.consentEvent.createMany as jest.Mock;
const mockGroupBy = prisma.consentEvent.groupBy as jest.Mock;
const mockEventMany = prisma.consentEvent.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({ id: 'subj-1' });
  mockSubjUpdateMany.mockResolvedValue({ count: 1 });
  mockCreateMany.mockResolvedValue({ count: 1 });
  mockGroupBy.mockResolvedValue([]);
  mockEventMany.mockResolvedValue([]);
  mockSubjFind.mockResolvedValue([]);
});

describe('recordConsent', () => {
  it('upserts the subject and appends one event per decision', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'web',
      decisions: [
        { category: 'analytics', granted: true },
        { category: 'marketing', granted: false },
      ],
      email: 'a@b.com',
      userId: 'u1',
      policyVersion: 'v3',
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consentId: 'c1' },
        create: expect.objectContaining({ consentId: 'c1', email: 'a@b.com', userId: 'u1' }),
        update: {},
      })
    );
    const rows = mockCreateMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      subjectId: 'subj-1',
      category: 'analytics',
      granted: true,
      source: 'web',
    });
    expect(rows[1]).toMatchObject({ category: 'marketing', granted: false });
  });

  it('fills identity only when the column is still null (never overwrites)', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'web',
      decisions: [{ category: 'analytics', granted: true }],
      email: 'a@b.com',
      userId: 'u1',
    });
    // consentId is matched with an explicit `equals` rather than a bare value:
    // updateMany's where accepts filters, so a bare value that turned out to be
    // an object at runtime would be read as one.
    expect(mockSubjUpdateMany).toHaveBeenCalledWith({
      where: { consentId: { equals: 'c1' }, userId: null },
      data: { userId: 'u1' },
    });
    expect(mockSubjUpdateMany).toHaveBeenCalledWith({
      where: { consentId: { equals: 'c1' }, email: null },
      data: { email: 'a@b.com' },
    });
  });

  // Defence in depth at the query, not just at the parser. If a future caller
  // reaches recordConsent without going through parseConsentSubmission, an
  // object consentId must still be compared rather than interpreted as a filter:
  // a bare `consentId: { not: 'x' }` would match every OTHER subject and write
  // the identity onto their rows.
  it('compares consentId by value even if a non-string reaches it', async () => {
    await recordConsent({
      consentId: { not: 'c1' } as unknown as string,
      source: 'web',
      decisions: [{ category: 'analytics', granted: true }],
      userId: 'u1',
    });

    const [call] = mockSubjUpdateMany.mock.calls;
    // The injected object is nested under `equals`, so Prisma compares against it
    // rather than treating `not` as an operator.
    expect(call[0].where.consentId).toEqual({ equals: { not: 'c1' } });
    expect(call[0].where.consentId).not.toHaveProperty('not');
  });

  it('does not attempt an identity backfill when none is supplied', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'mobile',
      decisions: [{ category: 'analytics', granted: true }],
    });
    expect(mockSubjUpdateMany).not.toHaveBeenCalled();
  });
});

describe('listConsentSubjects', () => {
  const subject = (id: string, over = {}) => ({
    id,
    consentId: `ph_${id}`,
    userId: null,
    email: `${id}@clinic.com`,
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...over,
  });

  it('derives current per-category state from the highest-seq event', async () => {
    mockSubjFind.mockResolvedValue([subject('s1')]);
    mockGroupBy.mockResolvedValue([
      { subjectId: 's1', category: 'analytics', _max: { seq: BigInt(10) } },
      { subjectId: 's1', category: 'marketing', _max: { seq: BigInt(12) } },
    ]);
    mockEventMany.mockResolvedValue([
      { seq: BigInt(10), subjectId: 's1', category: 'analytics', granted: true },
      { seq: BigInt(12), subjectId: 's1', category: 'marketing', granted: false },
    ]);

    const { subjects } = await listConsentSubjects({});
    expect(mockEventMany).toHaveBeenCalledWith({
      where: { seq: { in: [BigInt(10), BigInt(12)] } },
    });
    expect(subjects[0].state).toEqual({ analytics: 'granted', marketing: 'withdrawn' });
  });

  it('marks categories with no events as unset', async () => {
    mockSubjFind.mockResolvedValue([subject('s1')]);
    const { subjects } = await listConsentSubjects({});
    expect(subjects[0].state).toEqual({ analytics: 'unset', marketing: 'unset' });
  });

  it('ignores an event whose category is not a known consent category', async () => {
    mockSubjFind.mockResolvedValue([subject('s1')]);
    mockGroupBy.mockResolvedValue([
      { subjectId: 's1', category: 'legacy', _max: { seq: BigInt(5) } },
    ]);
    mockEventMany.mockResolvedValue([
      { seq: BigInt(5), subjectId: 's1', category: 'legacy', granted: true },
    ]);
    const { subjects } = await listConsentSubjects({});
    expect(subjects[0].state).toEqual({ analytics: 'unset', marketing: 'unset' });
  });

  it('paginates with a nextCursor when a full page plus one is returned', async () => {
    mockSubjFind.mockResolvedValue(Array.from({ length: 26 }, (_, i) => subject(`s${i}`)));
    const { subjects, nextCursor } = await listConsentSubjects({});
    expect(subjects).toHaveLength(25);
    expect(nextCursor).toBe('s24');
  });

  it('applies an email/consentId search filter', async () => {
    await listConsentSubjects({ search: 'clinic' });
    const where = mockSubjFind.mock.calls[0][0].where;
    expect(where.OR).toBeDefined();
  });

  it('pages from a cursor when one is supplied', async () => {
    await listConsentSubjects({ cursor: 's5' });
    const arg = mockSubjFind.mock.calls[0][0];
    expect(arg.skip).toBe(1);
    expect(arg.cursor).toEqual({ id: 's5' });
  });
});

describe('getSubjectDetail', () => {
  it('returns null for an unknown subject', async () => {
    mockSubjUnique.mockResolvedValue(null);
    expect(await getSubjectDetail('nope')).toBeNull();
  });

  it('falls back to empty state for a subject with no events', async () => {
    mockSubjUnique.mockResolvedValue({
      id: 's1',
      consentId: 'ph_s1',
      userId: null,
      email: null,
      updatedAt: new Date('2026-07-01'),
    });
    const detail = await getSubjectDetail('s1');
    expect(detail?.subject.state).toEqual({ analytics: 'unset', marketing: 'unset' });
    expect(detail?.history).toEqual([]);
  });

  it('returns the subject state plus full event history in seq order', async () => {
    mockSubjUnique.mockResolvedValue({
      id: 's1',
      consentId: 'ph_s1',
      userId: 'u1',
      email: 'a@b.com',
      updatedAt: new Date('2026-07-01'),
    });
    mockGroupBy.mockResolvedValue([
      { subjectId: 's1', category: 'analytics', _max: { seq: BigInt(20) } },
    ]);
    const historyRows = [
      {
        id: 'e2',
        seq: BigInt(20),
        category: 'analytics',
        granted: true,
        source: 'web',
        policyVersion: 'v3',
        createdAt: new Date('2026-07-02'),
      },
      {
        id: 'e1',
        seq: BigInt(15),
        category: 'analytics',
        granted: false,
        source: 'mobile',
        policyVersion: null,
        createdAt: new Date('2026-07-01'),
      },
    ];
    // getSubjectDetail fires both findMany calls in a Promise.all; branch on the
    // query shape rather than relying on call order.
    mockEventMany.mockImplementation((arg: { where?: { seq?: unknown } }) =>
      Promise.resolve(
        arg?.where?.seq
          ? [{ seq: BigInt(20), subjectId: 's1', category: 'analytics', granted: true }]
          : historyRows
      )
    );

    const detail = await getSubjectDetail('s1');
    expect(detail?.subject.state.analytics).toBe('granted');
    expect(detail?.history).toHaveLength(2);
    expect(detail?.history[0]).toMatchObject({ id: 'e2', granted: true, source: 'web' });
    // history query orders by seq desc
    const historyCall = mockEventMany.mock.calls.find((c) => c[0]?.orderBy)?.[0];
    expect(historyCall.orderBy).toEqual({ seq: 'desc' });
  });
});
