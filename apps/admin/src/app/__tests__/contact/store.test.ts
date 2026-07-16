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

  it('coerces an unknown stored status to new', async () => {
    mockFind.mockResolvedValue([row('r1', { status: 'weird' })]);
    const { requests } = await listContactRequests({});
    expect(requests[0].status).toBe('new');
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
