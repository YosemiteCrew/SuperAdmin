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
  it('adds exactly 30 days to receivedAt', () => {
    const received = new Date('2026-07-04T00:00:00.000Z');
    expect(computeDueAt(received).toISOString()).toBe('2026-08-03T00:00:00.000Z');
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
        dueAt: new Date('2026-08-03T00:00:00.000Z'),
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
    // dueAt is 30 days after receivedAt.
    expect(data.dueAt.getTime() - data.receivedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
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
