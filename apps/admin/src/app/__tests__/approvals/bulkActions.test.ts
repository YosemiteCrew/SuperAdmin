jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  requireSuperAdmin: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { revokeAllSessionsForUser: jest.fn() },
}));

jest.mock('@/app/features/approvals/store', () => ({
  approveAccount: jest.fn(),
  rejectAccount: jest.fn(),
  getApprovalState: jest.fn(),
}));
jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));
jest.mock('@/app/features/crm/plunk', () => ({
  sendTransactional: jest.fn(),
}));
jest.mock('@/app/features/crm/discord/dispatcher', () => ({
  notifyBulkDecision: jest.fn(),
}));
jest.mock('@/app/features/users/bootstrap', () => ({
  isBootstrapAdmin: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import { requireSuperAdmin } from '@/app/config/backend';
import { approveAccount, getApprovalState, rejectAccount } from '@/app/features/approvals/store';
import { recordAuditEvent } from '@/app/features/audit/store';
import { notifyBulkDecision } from '@/app/features/crm/discord/dispatcher';
import { sendTransactional } from '@/app/features/crm/plunk';
import { isBootstrapAdmin } from '@/app/features/users/bootstrap';
import {
  bulkApproveAccountsAction,
  bulkRejectAccountsAction,
} from '@/app/(routes)/(dashboard)/approvals/bulkActions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockRevokeAll = SessionNode.revokeAllSessionsForUser as jest.MockedFunction<
  typeof SessionNode.revokeAllSessionsForUser
>;
const mockApprove = approveAccount as jest.MockedFunction<typeof approveAccount>;
const mockReject = rejectAccount as jest.MockedFunction<typeof rejectAccount>;
const mockGetState = getApprovalState as jest.MockedFunction<typeof getApprovalState>;
const mockAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;
const mockSendEmail = sendTransactional as jest.MockedFunction<typeof sendTransactional>;
const mockNotify = notifyBulkDecision as jest.MockedFunction<typeof notifyBulkDecision>;
const mockBootstrap = isBootstrapAdmin as jest.MockedFunction<typeof isBootstrapAdmin>;

const ACTOR_ID = 'admin-1';
type StUser = Awaited<ReturnType<typeof SuperTokens.getUser>>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  mockRequireSuperAdmin.mockResolvedValue({ userId: ACTOR_ID });
  mockGetUser.mockImplementation(
    async (id: string) => ({ id, emails: [`${id}@test.com`] }) as unknown as StUser
  );
  mockGetState.mockResolvedValue({ status: 'pending' });
  mockApprove.mockResolvedValue({ stillDisabled: false });
  mockReject.mockResolvedValue(undefined);
  mockRevokeAll.mockResolvedValue([]);
  mockAudit.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue(undefined);
  mockNotify.mockResolvedValue(undefined);
  mockBootstrap.mockResolvedValue(false);
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('bulkApproveAccountsAction', () => {
  it('rejects an empty selection', async () => {
    const result = await bulkApproveAccountsAction([]);
    expect(result.error).toMatch(/No accounts/);
  });

  it('rejects a batch over the cap', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `u${i}`);
    const result = await bulkApproveAccountsAction(ids);
    expect(result.error).toMatch(/at most 50/);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('deduplicates ids and drops non-strings', async () => {
    await bulkApproveAccountsAction(['u1', 'u1', '', 42 as unknown as string]);
    expect(mockApprove).toHaveBeenCalledTimes(1);
  });

  it('approves each pending account, audits, and sends welcome emails', async () => {
    const result = await bulkApproveAccountsAction(['u1', 'u2']);

    expect(mockApprove).toHaveBeenCalledTimes(2);
    expect(mockAudit).toHaveBeenCalledTimes(2);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.approve', targetId: 'u1' })
    );
    expect(result).toEqual({ processed: 2, skipped: 0, failed: 0, emailsSent: 2 });
  });

  it('a mid-loop store failure never aborts the sweep', async () => {
    mockApprove
      .mockRejectedValueOnce(new Error('metadata write failed'))
      .mockResolvedValueOnce({ stillDisabled: false });

    const result = await bulkApproveAccountsAction(['u1', 'u2']);

    expect(result.error).toBeUndefined();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    // The batch summary still fires for what WAS processed.
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    expect(console.error).toHaveBeenCalled();
  });

  it('skips accounts that are no longer pending', async () => {
    mockGetState
      .mockResolvedValueOnce({ status: 'rejected', rejectedAt: 1 })
      .mockResolvedValueOnce({ status: 'pending' });

    const result = await bulkApproveAccountsAction(['u1', 'u2']);
    expect(mockApprove).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('skips accounts whose state cannot be read (fail closed)', async () => {
    mockGetState.mockRejectedValueOnce(new Error('down'));
    const result = await bulkApproveAccountsAction(['u1']);
    expect(mockApprove).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it('continues past a failed welcome email and counts it as unsent', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('plunk down'));
    const result = await bulkApproveAccountsAction(['u1', 'u2']);
    expect(result.processed).toBe(2);
    expect(result.emailsSent).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('skips the welcome email for accounts still manually disabled', async () => {
    mockApprove.mockResolvedValue({ stillDisabled: true });
    const result = await bulkApproveAccountsAction(['u1']);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.emailsSent).toBe(0);
  });

  it('sends one Discord summary for the batch', async () => {
    await bulkApproveAccountsAction(['u1', 'u2']);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'approved', count: 2 })
    );
  });

  it('skips Discord when nothing was processed', async () => {
    mockGetState.mockResolvedValue({ status: 'approved', approvedAt: 1 });
    await bulkApproveAccountsAction(['u1']);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('skips accounts whose lookup fails without sinking the batch', async () => {
    mockGetUser
      .mockRejectedValueOnce(new Error('core down'))
      .mockImplementation(
        async (id: string) => ({ id, emails: [`${id}@test.com`] }) as unknown as StUser
      );
    const result = await bulkApproveAccountsAction(['u1', 'u2']);
    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('falls back to the actor id when the actor lookup fails for Discord', async () => {
    // Target lookups succeed; the final actor lookup throws.
    mockGetUser
      .mockResolvedValueOnce({ id: 'u1', emails: ['u1@test.com'] } as unknown as StUser)
      .mockRejectedValueOnce(new Error('core down'));
    await bulkApproveAccountsAction(['u1']);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ actorEmail: ACTOR_ID }));
  });

  it('still succeeds when the Discord summary fails', async () => {
    mockNotify.mockRejectedValueOnce(new Error('webhook down'));
    const result = await bulkApproveAccountsAction(['u1']);
    expect(result.error).toBeUndefined();
    expect(result.processed).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('bulkRejectAccountsAction', () => {
  it('rejects a batch over the cap', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `u${i}`);
    const result = await bulkRejectAccountsAction(ids);
    expect(result.error).toMatch(/at most 50/);
  });

  it('never rejects the acting admin in a sweep', async () => {
    const result = await bulkRejectAccountsAction([ACTOR_ID, 'u2']);
    expect(mockReject).toHaveBeenCalledTimes(1);
    expect(mockReject).toHaveBeenCalledWith({ userId: 'u2', actorId: ACTOR_ID });
    expect(result.skipped).toBe(1);
  });

  it('never rejects a bootstrap admin in a sweep', async () => {
    mockBootstrap.mockImplementation(async (id: string) => id === 'boot-1');
    const result = await bulkRejectAccountsAction(['boot-1', 'u2']);
    expect(mockReject).toHaveBeenCalledTimes(1);
    expect(result.skipped).toBe(1);
  });

  it('rejects pending accounts, audits each, and revokes sessions', async () => {
    const result = await bulkRejectAccountsAction(['u1', 'u2']);

    expect(mockReject).toHaveBeenCalledTimes(2);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.reject', targetId: 'u2' })
    );
    expect(mockRevokeAll).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ processed: 2, skipped: 0, failed: 0 });
  });

  it('a mid-loop store failure never aborts the sweep', async () => {
    mockReject
      .mockRejectedValueOnce(new Error('metadata write failed'))
      .mockResolvedValue(undefined);

    const result = await bulkRejectAccountsAction(['u1', 'u2']);

    expect(result.error).toBeUndefined();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('keeps going when a session revocation fails', async () => {
    mockRevokeAll.mockRejectedValueOnce(new Error('down'));
    const result = await bulkRejectAccountsAction(['u1', 'u2']);
    expect(result.processed).toBe(2);
    expect(console.error).toHaveBeenCalled();
  });

  it('skips accounts that are no longer pending', async () => {
    mockGetState.mockResolvedValueOnce({ status: 'approved', approvedAt: 1 });
    const result = await bulkRejectAccountsAction(['u1']);
    expect(mockReject).not.toHaveBeenCalled();
    expect(result.skipped).toBe(1);
  });

  it('sends one Discord summary for the batch', async () => {
    await bulkRejectAccountsAction(['u1']);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'rejected', count: 1 })
    );
  });

  it('skips accounts whose lookup fails without sinking the batch', async () => {
    mockGetUser
      .mockRejectedValueOnce(new Error('core down'))
      .mockImplementation(
        async (id: string) => ({ id, emails: [`${id}@test.com`] }) as unknown as StUser
      );
    const result = await bulkRejectAccountsAction(['u1', 'u2']);
    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('still succeeds when the Discord summary fails', async () => {
    mockNotify.mockRejectedValueOnce(new Error('webhook down'));
    const result = await bulkRejectAccountsAction(['u1']);
    expect(result.error).toBeUndefined();
    expect(result.processed).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });
});
