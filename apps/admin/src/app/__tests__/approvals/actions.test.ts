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
  notifyAccountDecision: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import { requireSuperAdmin } from '@/app/config/backend';
import { approveAccount, getApprovalState, rejectAccount } from '@/app/features/approvals/store';
import { recordAuditEvent } from '@/app/features/audit/store';
import { notifyAccountDecision } from '@/app/features/crm/discord/dispatcher';
import { sendTransactional } from '@/app/features/crm/plunk';
import {
  approveAccountAction,
  rejectAccountAction,
} from '@/app/(routes)/(dashboard)/approvals/actions';

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
const mockNotify = notifyAccountDecision as jest.MockedFunction<typeof notifyAccountDecision>;

const ACTOR_ID = 'admin-1';

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

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
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('approveAccountAction', () => {
  it('rejects a missing userId', async () => {
    const result = await approveAccountAction(fd({ userId: '', expectedStatus: 'pending' }));
    expect(result.error).toBeTruthy();
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('errors when the account does not exist', async () => {
    mockGetUser.mockResolvedValueOnce(undefined as unknown as StUser);
    const result = await approveAccountAction(fd({ userId: 'ghost', expectedStatus: 'pending' }));
    expect(result.error).toBe('Account not found.');
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('refuses when the account state changed since the page loaded', async () => {
    mockGetState.mockResolvedValue({ status: 'rejected', rejectedAt: 1 });
    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));
    expect(result.error).toMatch(/changed state/);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('refuses when expectedStatus is missing', async () => {
    const result = await approveAccountAction(fd({ userId: 'u1' }));
    expect(result.error).toMatch(/changed state/);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('approves, audits, and sends the welcome email', async () => {
    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));

    expect(mockApprove).toHaveBeenCalledWith({ userId: 'u1', actorId: ACTOR_ID });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.approve', targetId: 'u1' })
    );
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'u1@test.com' }));
    expect(result.emailSent).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('records the audit even when the actor lookup fails', async () => {
    // Target resolves; the later actor lookup (2nd getUser call) throws.
    mockGetUser
      .mockResolvedValueOnce({ id: 'u1', emails: ['u1@test.com'] } as unknown as StUser)
      .mockRejectedValueOnce(new Error('core down'));

    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.approve' }));
    expect(result.error).toBeUndefined();
  });

  it('skips the welcome email and warns when the account is still disabled', async () => {
    mockApprove.mockResolvedValue({ stillDisabled: true });
    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
    expect(result.warning).toMatch(/still disabled/);
  });

  it('approval still succeeds when the welcome email fails', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('plunk down'));
    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));

    expect(mockApprove).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(result.emailSent).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('approval still succeeds when the Discord notify fails', async () => {
    mockNotify.mockRejectedValueOnce(new Error('webhook down'));
    const result = await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));
    expect(result.error).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('notifies Discord with the approval decision', async () => {
    await approveAccountAction(fd({ userId: 'u1', expectedStatus: 'pending' }));
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'approved', accountEmail: 'u1@test.com' })
    );
  });
});

describe('rejectAccountAction', () => {
  it('rejects a missing userId', async () => {
    const result = await rejectAccountAction(fd({ userId: '', expectedStatus: 'pending' }));
    expect(result.error).toBeTruthy();
    expect(mockReject).not.toHaveBeenCalled();
  });

  it('blocks rejecting your own account', async () => {
    const result = await rejectAccountAction(fd({ userId: ACTOR_ID, expectedStatus: 'pending' }));
    expect(result.error).toBe('You cannot reject your own account.');
    expect(mockReject).not.toHaveBeenCalled();
  });

  it('errors when the account does not exist', async () => {
    mockGetUser.mockResolvedValueOnce(undefined as unknown as StUser);
    const result = await rejectAccountAction(fd({ userId: 'ghost', expectedStatus: 'pending' }));
    expect(result.error).toBe('Account not found.');
  });

  it('refuses when the account state changed since the page loaded', async () => {
    mockGetState.mockResolvedValue({ status: 'approved', approvedAt: 1 });
    const result = await rejectAccountAction(fd({ userId: 'u2', expectedStatus: 'pending' }));
    expect(result.error).toMatch(/changed state/);
    expect(mockReject).not.toHaveBeenCalled();
  });

  it('rejects, audits, revokes sessions, and notifies Discord', async () => {
    const result = await rejectAccountAction(fd({ userId: 'u2', expectedStatus: 'pending' }));

    expect(mockReject).toHaveBeenCalledWith({ userId: 'u2', actorId: ACTOR_ID });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.reject', targetId: 'u2' })
    );
    expect(mockRevokeAll).toHaveBeenCalledWith('u2');
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'rejected', accountEmail: 'u2@test.com' })
    );
    expect(result.error).toBeUndefined();
    expect(result.warning).toBeUndefined();
  });

  it('keeps the audit record and warns when session revocation fails', async () => {
    mockRevokeAll.mockRejectedValueOnce(new Error('core down'));
    const result = await rejectAccountAction(fd({ userId: 'u2', expectedStatus: 'pending' }));

    expect(mockReject).toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.reject' }));
    expect(result.error).toBeUndefined();
    expect(result.warning).toMatch(/revoking live sessions failed/);
    expect(console.error).toHaveBeenCalled();
  });

  it('never sends a welcome email on rejection', async () => {
    await rejectAccountAction(fd({ userId: 'u2', expectedStatus: 'pending' }));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
