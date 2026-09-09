/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

const env: { socialSchedulerKey: string | null } = { socialSchedulerKey: null };
jest.mock('@/app/config/env.server', () => ({
  serverEnv: {
    get socialSchedulerKey() {
      return env.socialSchedulerKey;
    },
  },
}));

const fetchApprovalCandidatesMock = jest.fn();
const scanApprovalStatusesMock = jest.fn();
const countPendingMock = jest.fn();
jest.mock('@/app/features/approvals/queue', () => ({
  fetchApprovalCandidates: (...args: unknown[]) => fetchApprovalCandidatesMock(...args),
  scanApprovalStatuses: (...args: unknown[]) => scanApprovalStatusesMock(...args),
  countPending: (...args: unknown[]) => countPendingMock(...args),
}));

const refreshApprovalStatusIndexMock = jest.fn();
jest.mock('@/app/features/approvals/store', () => ({
  refreshApprovalStatusIndex: (...args: unknown[]) => refreshApprovalStatusIndexMock(...args),
}));

import { POST } from '@/app/api/approvals/reconcile/route';

const USERS = [{ id: 'u1', emails: ['one@example.com'], timeJoined: 1 }];
const ROWS = [{ id: 'u1', email: 'one@example.com', joinedAt: 1, status: 'pending' }];

function request(key?: string): NextRequest {
  return new NextRequest('https://admin.example.com/api/approvals/reconcile', {
    method: 'POST',
    headers: key ? { 'x-scheduler-key': key } : undefined,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  env.socialSchedulerKey = 'correct-horse';
  fetchApprovalCandidatesMock.mockResolvedValue(USERS);
  scanApprovalStatusesMock.mockResolvedValue({ rows: ROWS, indexableRows: ROWS });
  refreshApprovalStatusIndexMock.mockResolvedValue(true);
  countPendingMock.mockReturnValue(1);
});

describe('POST /api/approvals/reconcile', () => {
  it('refuses requests when the shared scheduler key is unset or wrong', async () => {
    env.socialSchedulerKey = null;
    expect((await POST(request('anything'))).status).toBe(503);

    env.socialSchedulerKey = 'correct-horse';
    expect((await POST(request('wrong'))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
    expect(fetchApprovalCandidatesMock).not.toHaveBeenCalled();
  });

  it('rebuilds the current dashboard window from authoritative metadata', async () => {
    const response = await POST(request('correct-horse'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ indexed: 1, pending: 1 });
    expect(fetchApprovalCandidatesMock).toHaveBeenCalledWith(100);
    expect(refreshApprovalStatusIndexMock).toHaveBeenCalledWith(ROWS);
  });

  it('reports an incomplete metadata scan to the scheduler', async () => {
    scanApprovalStatusesMock.mockResolvedValue({ rows: ROWS, indexableRows: [] });

    const response = await POST(request('correct-horse'));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Approval reconciliation was incomplete',
      indexed: 0,
    });
  });

  it('reports a derived-index write failure to the scheduler', async () => {
    refreshApprovalStatusIndexMock.mockResolvedValue(false);

    const response = await POST(request('correct-horse'));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'Approval reconciliation was incomplete',
      indexed: 1,
    });
  });
});
