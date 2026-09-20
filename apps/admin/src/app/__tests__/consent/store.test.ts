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
        update: { updatedAt: expect.any(Date) },
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

  it('bumps the subject timestamp for an anonymous decision without writing identity', async () => {
    await recordConsent({
      consentId: 'anonymous-1',
      source: 'web',
      decisions: [{ category: 'analytics', granted: false }],
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { consentId: 'anonymous-1' },
      create: { consentId: 'anonymous-1', userId: null, email: null },
      update: { updatedAt: expect.any(Date) },
    });
    expect(mockSubjUpdateMany).not.toHaveBeenCalled();
  });

  it('fills an identity pair in one conditional write so concurrent submissions cannot split it', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'web',
      decisions: [{ category: 'analytics', granted: true }],
      email: 'a@b.com',
      userId: 'u1',
    });
    expect(mockSubjUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockSubjUpdateMany).toHaveBeenCalledWith({
      where: {
        consentId: { equals: 'c1' },
        AND: [
          { OR: [{ userId: null }, { userId: { equals: 'u1' } }] },
          { OR: [{ email: null }, { email: { equals: 'a@b.com' } }] },
        ],
      },
      data: { userId: 'u1', email: 'a@b.com' },
    });
  });

  it('does not attach a partial identity to a subject already linked by the other field', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'web',
      decisions: [{ category: 'analytics', granted: true }],
      userId: 'u1',
    });

    expect(mockSubjUpdateMany).toHaveBeenCalledWith({
      where: {
        consentId: { equals: 'c1' },
        AND: [{ OR: [{ userId: null }, { userId: { equals: 'u1' } }] }, { email: null }],
      },
      data: { userId: 'u1' },
    });
  });

  it('keeps an email-only backfill away from a subject that already has a user id', async () => {
    await recordConsent({
      consentId: 'c1',
      source: 'web',
      decisions: [{ category: 'analytics', granted: true }],
      email: 'a@b.com',
    });

    expect(mockSubjUpdateMany).toHaveBeenCalledWith({
      where: {
        consentId: { equals: 'c1' },
        AND: [{ userId: null }, { OR: [{ email: null }, { email: { equals: 'a@b.com' } }] }],
      },
      data: { email: 'a@b.com' },
    });
  });

  it('refuses a non-string consent id before any database query', async () => {
    await expect(
      recordConsent({
        consentId: { not: 'c1' } as unknown as string,
        source: 'web',
        decisions: [{ category: 'analytics', granted: true }],
        userId: 'u1',
      })
    ).rejects.toThrow(TypeError);

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSubjUpdateMany).not.toHaveBeenCalled();
  });

  it.each(['userId', 'email'] as const)(
    'drops a non-string %s before persistence',
    async (field) => {
      await recordConsent({
        consentId: 'c1',
        source: 'web',
        decisions: [{ category: 'analytics', granted: true }],
        [field]: { not: 'x' } as unknown as string,
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ [field]: null }) })
      );
      expect(mockSubjUpdateMany).not.toHaveBeenCalled();
    }
  );

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
  const cursorFor = (updatedAt: Date, id: string) =>
    Buffer.from(JSON.stringify({ updatedAt: updatedAt.getTime(), id })).toString('base64url');

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
    expect(nextCursor).toBe(cursorFor(subjects[24].updatedAt, 's24'));
  });

  it('applies an email/consentId search filter', async () => {
    await listConsentSubjects({ search: 'clinic' });
    const where = mockSubjFind.mock.calls[0][0].where;
    expect(where.AND[0].OR).toBeDefined();
  });

  it('pages from encoded sort values without a row cursor or skip', async () => {
    const updatedAt = new Date('2026-07-04T12:00:00Z');
    await listConsentSubjects({ cursor: cursorFor(updatedAt, 's5') });
    const arg = mockSubjFind.mock.calls[0][0];
    expect(arg).not.toHaveProperty('skip');
    expect(arg).not.toHaveProperty('cursor');
    expect(arg.where).toEqual({
      AND: [
        {},
        {
          OR: [{ updatedAt: { lt: updatedAt } }, { updatedAt, id: { lt: 's5' } }],
        },
      ],
    });
  });

  it('treats an unparseable cursor as a first-page query', async () => {
    await listConsentSubjects({ cursor: 'not-a-cursor' });

    expect(mockSubjFind).toHaveBeenCalledTimes(1);
    expect(mockSubjFind.mock.calls[0][0].where).toEqual({ AND: [{}, {}] });
  });

  it('falls back to the first page once when a parsed cursor returns no rows', async () => {
    const firstPage = [subject('s1')];
    mockSubjFind.mockResolvedValueOnce([]).mockResolvedValueOnce(firstPage);

    const result = await listConsentSubjects({
      cursor: cursorFor(new Date('2026-07-04T12:00:00Z'), 'missing'),
    });

    expect(mockSubjFind).toHaveBeenCalledTimes(2);
    expect(mockSubjFind.mock.calls[1][0].where).toEqual({});
    expect(result.subjects).toHaveLength(1);
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

describe('listConsentSubjects ordering', () => {
  // `updatedAt` is not unique, and the cursor resolves to its value rather than
  // to the row, so without `id` the boundary between two subjects touched in the
  // same millisecond is plan-dependent and one can be skipped between pages.
  it('orders by updatedAt with id as a tiebreaker', async () => {
    mockSubjFind.mockResolvedValue([]);
    await listConsentSubjects({});
    expect(mockSubjFind.mock.calls[0][0].orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }]);
  });
});
