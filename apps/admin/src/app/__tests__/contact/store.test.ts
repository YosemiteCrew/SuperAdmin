jest.mock('server-only', () => ({}));
jest.mock('@superadmin/database', () => ({
  prisma: {
    contactRequest: { findMany: jest.fn(), groupBy: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '@superadmin/database';
import {
  countRequestsByStatus,
  isRequestStatus,
  listContactRequests,
  normalizeCursor,
  setRequestStatus,
} from '@/app/features/contact/store';

const mockFind = prisma.contactRequest.findMany as jest.Mock;
const mockGroup = prisma.contactRequest.groupBy as jest.Mock;
const mockUpdate = prisma.contactRequest.update as jest.Mock;

function row(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    subject: 'Demo',
    message: 'hello',
    sourceUrl: 'https://www.yosemitecrew.com/contact-us',
    status: 'new',
    createdAt: new Date('2026-07-01T00:00:00Z'),
    lead: {
      email: `${id}@clinic.com`,
      name: 'Dr Smith',
      company: 'Happy Paws',
      phone: '+49 152 277 63275',
      newsletterConsent: true,
      consentAt: new Date('2026-07-01T00:00:00Z'),
    },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockResolvedValue([]);
  mockGroup.mockResolvedValue([]);
  mockUpdate.mockResolvedValue({});
});

describe('isRequestStatus', () => {
  it('accepts the known statuses and rejects others', () => {
    expect(isRequestStatus('new')).toBe(true);
    expect(isRequestStatus('in_progress')).toBe(true);
    expect(isRequestStatus('closed')).toBe(true);
    expect(isRequestStatus('deleted')).toBe(false);
    expect(isRequestStatus(42)).toBe(false);
  });
});

describe('listContactRequests', () => {
  it('flattens lead fields onto each request view', async () => {
    mockFind.mockResolvedValue([row('r1')]);
    const { requests, nextCursor } = await listContactRequests({});
    expect(requests[0]).toMatchObject({
      id: 'r1',
      email: 'r1@clinic.com',
      name: 'Dr Smith',
      phone: '+49 152 277 63275',
      newsletterConsent: true,
      status: 'new',
    });
    expect(nextCursor).toBeNull();
  });

  it('returns a nextCursor when a full page plus one is fetched', async () => {
    mockFind.mockResolvedValue(Array.from({ length: 26 }, (_, i) => row(`r${i}`)));
    const { requests, nextCursor } = await listContactRequests({});
    expect(requests).toHaveLength(25);
    expect(nextCursor).toBe('r24');
  });

  it('filters by status and paginates from a cursor', async () => {
    await listContactRequests({ status: 'closed', cursor: 'r5' });
    const arg = mockFind.mock.calls[0][0];
    expect(arg.where).toEqual({ status: 'closed' });
    expect(arg.cursor).toEqual({ id: 'r5' });
    expect(arg.skip).toBe(1);
  });

  // The cursor resolves to a `createdAt` value, not to the row, so the sort has
  // to be a total order or the page boundary between rows sharing a timestamp
  // is decided by whichever plan Postgres picks - and a request then falls
  // between two pages without a trace. Contact requests arrive in bursts, so
  // tied timestamps are ordinary.
  it('orders by createdAt with id as a tiebreaker, so pagination is total', async () => {
    await listContactRequests({});
    expect(mockFind.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('coerces an unknown stored status to new', async () => {
    mockFind.mockResolvedValue([row('r1', { status: 'weird' })]);
    const { requests } = await listContactRequests({});
    expect(requests[0].status).toBe('new');
  });

  // Prisma does not error on a cursor that matches no row, it just returns
  // nothing (verified against Postgres 16 with this schema), which would show
  // the empty state over a table that has rows in it.
  it('falls back to the first page when a cursor matches no row', async () => {
    mockFind.mockResolvedValueOnce([]).mockResolvedValueOnce([row('r1')]);

    const { requests } = await listContactRequests({ cursor: 'deleted-or-stale' });

    expect(requests).toHaveLength(1);
    expect(mockFind).toHaveBeenCalledTimes(2);
    const retry = mockFind.mock.calls[1][0];
    expect(retry.cursor).toBeUndefined();
    expect(retry.skip).toBeUndefined();
  });

  it('does not re-query when a cursor legitimately returns rows', async () => {
    mockFind.mockResolvedValue([row('r1')]);
    await listContactRequests({ cursor: 'r0' });
    expect(mockFind).toHaveBeenCalledTimes(1);
  });

  it('does not re-query when the table is genuinely empty and no cursor was given', async () => {
    mockFind.mockResolvedValue([]);
    const { requests } = await listContactRequests({});
    expect(requests).toEqual([]);
    expect(mockFind).toHaveBeenCalledTimes(1);
  });
});

describe('normalizeCursor', () => {
  it('passes a non-empty string through', () => {
    expect(normalizeCursor('cmsu4x30p00018o3wei9cqv45')).toBe('cmsu4x30p00018o3wei9cqv45');
  });

  // ?cursor=a&cursor=b - Prisma throws PrismaClientValidationError on a
  // non-string cursor, which nothing on the read path catches.
  it('drops a repeated query param that arrives as an array', () => {
    expect(normalizeCursor(['a', 'b'])).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['null', null],
    ['a number', 42],
    ['an object', { id: 'r1' }],
  ])('treats %s as no cursor', (_label, value) => {
    expect(normalizeCursor(value)).toBeUndefined();
  });
});

describe('countRequestsByStatus', () => {
  it('maps grouped counts and zero-fills the rest', async () => {
    mockGroup.mockResolvedValue([
      { status: 'new', _count: { _all: 3 } },
      { status: 'closed', _count: { _all: 5 } },
      { status: 'bogus', _count: { _all: 9 } },
    ]);
    expect(await countRequestsByStatus()).toEqual({ new: 3, in_progress: 0, closed: 5 });
  });
});

describe('setRequestStatus', () => {
  it('writes the status and the acting admin', async () => {
    await setRequestStatus({ requestId: 'r1', status: 'closed', actorId: 'admin-1' });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'closed', handledBy: 'admin-1' },
    });
  });
});
