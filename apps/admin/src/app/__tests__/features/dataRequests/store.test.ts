jest.mock('@superadmin/database', () => ({
  prisma: {
    dataRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@superadmin/database';
import {
  computeDueAt,
  createDataRequest,
  getDataRequestStats,
  listDataRequests,
  updateDataRequestStatus,
} from '@/app/features/dataRequests/store';

const mockCreate = prisma.dataRequest.create as jest.MockedFunction<
  typeof prisma.dataRequest.create
>;
const mockFindMany = prisma.dataRequest.findMany as jest.MockedFunction<
  typeof prisma.dataRequest.findMany
>;
const mockUpdate = prisma.dataRequest.update as jest.MockedFunction<
  typeof prisma.dataRequest.update
>;
const mockCount = prisma.dataRequest.count as jest.MockedFunction<typeof prisma.dataRequest.count>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('computeDueAt', () => {
  // The statutory period is one calendar month (GDPR Article 12(3), counted
  // under Regulation (EEC, Euratom) No 1182/71), which is 28, 29, 30 or 31 days
  // depending on where it starts. Each case below is a different length, and the
  // February and month-end ones are where a flat 30 days lands AFTER the real
  // deadline - the direction that makes the panel report a breached request as
  // still in time.
  it.each([
    // received                     due                          days  note
    ['2026-07-04T00:00:00.000Z', '2026-08-04T00:00:00.000Z', '31-day month'],
    ['2026-04-10T09:30:00.000Z', '2026-05-10T09:30:00.000Z', '30-day month, time of day preserved'],
    [
      '2027-02-10T00:00:00.000Z',
      '2027-03-10T00:00:00.000Z',
      '28-day month, where 30 days is 2 late',
    ],
    [
      '2028-02-10T00:00:00.000Z',
      '2028-03-10T00:00:00.000Z',
      '29-day month, where 30 days is 1 late',
    ],
    ['2026-12-15T12:00:00.000Z', '2027-01-15T12:00:00.000Z', 'year rollover'],
  ])('%s -> %s (%s)', (received, due) => {
    expect(computeDueAt(new Date(received)).toISOString()).toBe(due);
  });

  // Regulation (EEC, Euratom) No 1182/71 Article 3(2)(c): where the following
  // month has no day of that number, the period ends on its last day. JavaScript
  // rolls the overflow forward instead, so this is the case an unclamped
  // implementation gets wrong.
  it.each([
    ['2027-01-31T00:00:00.000Z', '2027-02-28T00:00:00.000Z', 'non-leap February'],
    ['2028-01-31T00:00:00.000Z', '2028-02-29T00:00:00.000Z', 'leap February'],
    ['2027-01-29T00:00:00.000Z', '2027-02-28T00:00:00.000Z', 'clamped from the 29th'],
    ['2026-03-31T00:00:00.000Z', '2026-04-30T00:00:00.000Z', '31st into a 30-day month'],
  ])('clamps %s -> %s (%s)', (received, due) => {
    expect(computeDueAt(new Date(received)).toISOString()).toBe(due);
  });

  it('never lands after one calendar month, across a full year of receipts', () => {
    // The property, not a table of examples: a deadline that is even one day
    // late is a missed statutory month. Walks every day of a leap year and a
    // non-leap year and checks the result against the month and day arithmetic
    // directly, so a future rewrite of computeDueAt cannot quietly regain the
    // 30-day behaviour on the days no example happens to cover.
    for (const year of [2027, 2028]) {
      for (let dayOffset = 0; dayOffset < 366; dayOffset += 1) {
        const received = new Date(Date.UTC(year, 0, 1 + dayOffset));
        if (received.getUTCFullYear() !== year) break;

        const due = computeDueAt(received);
        const expectedMonth = (received.getUTCMonth() + 1) % 12;
        const lastDayOfTargetMonth = new Date(
          Date.UTC(received.getUTCFullYear(), received.getUTCMonth() + 2, 0)
        ).getUTCDate();

        const expectedYear =
          received.getUTCMonth() === 11 ? received.getUTCFullYear() + 1 : received.getUTCFullYear();

        expect(due.getUTCFullYear()).toBe(expectedYear);
        expect(due.getUTCMonth()).toBe(expectedMonth);
        expect(due.getUTCDate()).toBe(Math.min(received.getUTCDate(), lastDayOfTargetMonth));
      }
    }
  });
});

describe('createDataRequest', () => {
  it('normalises email, trims notes, and derives dueAt from receivedAt', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_1' } as never);
    const receivedAt = new Date('2026-07-04T00:00:00.000Z');

    await createDataRequest({
      subjectEmail: '  Person@Example.com ',
      type: 'access',
      notes: '  see ticket 42  ',
      receivedAt,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        subjectEmail: 'person@example.com',
        type: 'access',
        notes: 'see ticket 42',
        receivedAt,
        dueAt: new Date('2026-08-04T00:00:00.000Z'),
      },
    });
  });

  it('stores null when notes are blank', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_2' } as never);

    await createDataRequest({
      subjectEmail: 'a@b.com',
      type: 'erasure',
      notes: '   ',
      receivedAt: new Date('2026-07-04T00:00:00.000Z'),
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notes: null }) })
    );
  });

  it('defaults receivedAt to now when omitted', async () => {
    mockCreate.mockResolvedValue({ id: 'dr_3' } as never);
    const before = Date.now();

    await createDataRequest({ subjectEmail: 'a@b.com', type: 'objection' });

    const { data } = mockCreate.mock.calls[0][0] as { data: { receivedAt: Date; dueAt: Date } };
    expect(data.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
    // Against computeDueAt of the SAME receivedAt, not against a fixed number of
    // milliseconds: a month is not a constant duration, so a fixed delta here
    // passes or fails depending on which month the suite happens to run in.
    expect(data.dueAt.toISOString()).toBe(computeDueAt(data.receivedAt).toISOString());
  });
});

describe('listDataRequests', () => {
  it('fetches all requests ordered by dueAt ascending', async () => {
    mockFindMany.mockResolvedValue([] as never);
    await listDataRequests();
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { dueAt: 'asc' } });
  });

  it('returns open requests before closed ones, preserving deadline order', async () => {
    // Deliberately interleaved and returned in dueAt-asc order by the DB mock.
    mockFindMany.mockResolvedValue([
      { id: 'closed_old', status: 'fulfilled' },
      { id: 'open_urgent', status: 'received' },
      { id: 'closed_recent', status: 'rejected' },
      { id: 'open_later', status: 'in_progress' },
    ] as never);

    const result = await listDataRequests();

    expect(result.map((r) => r.id)).toEqual([
      'open_urgent',
      'open_later',
      'closed_old',
      'closed_recent',
    ]);
  });
});

describe('updateDataRequestStatus', () => {
  it('stamps fulfilledAt when fulfilling', async () => {
    mockUpdate.mockResolvedValue({} as never);
    const now = new Date('2026-07-10T00:00:00.000Z');

    await updateDataRequestStatus({ id: 'dr_1', status: 'fulfilled', handledBy: 'admin_1', now });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'dr_1' },
      data: { status: 'fulfilled', handledBy: 'admin_1', fulfilledAt: now },
    });
  });

  it('defaults now to the current time when omitted', async () => {
    mockUpdate.mockResolvedValue({} as never);
    const before = Date.now();

    await updateDataRequestStatus({ id: 'dr_1', status: 'fulfilled', handledBy: 'admin_1' });

    const { data } = mockUpdate.mock.calls[0][0] as { data: { fulfilledAt: Date } };
    expect(data.fulfilledAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('clears fulfilledAt when moving to a non-fulfilled status', async () => {
    mockUpdate.mockResolvedValue({} as never);

    await updateDataRequestStatus({
      id: 'dr_1',
      status: 'in_progress',
      handledBy: 'admin_1',
      now: new Date('2026-07-10T00:00:00.000Z'),
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'dr_1' },
      data: { status: 'in_progress', handledBy: 'admin_1', fulfilledAt: null },
    });
  });
});

describe('getDataRequestStats', () => {
  it('counts total, open, and overdue against the supplied now', async () => {
    mockCount
      .mockResolvedValueOnce(9 as never) // total
      .mockResolvedValueOnce(4 as never) // open
      .mockResolvedValueOnce(2 as never); // overdue
    const now = new Date('2026-07-04T00:00:00.000Z');

    const stats = await getDataRequestStats(now);

    expect(stats).toEqual({ total: 9, open: 4, overdue: 2 });
    expect(mockCount).toHaveBeenNthCalledWith(1);
    expect(mockCount).toHaveBeenNthCalledWith(2, {
      where: { status: { in: ['received', 'in_progress'] } },
    });
    expect(mockCount).toHaveBeenNthCalledWith(3, {
      where: { status: { in: ['received', 'in_progress'] }, dueAt: { lt: now } },
    });
  });
});
