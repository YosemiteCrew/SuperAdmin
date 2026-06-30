jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/app/config/backend', () => ({
  requireSuperAdmin: jest.fn(),
}));

jest.mock('@/app/config/env.public', () => ({
  publicEnv: { appOrigin: 'https://admin.test' },
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('@/app/features/invites/store', () => ({
  createInvite: jest.fn(),
  revokeInvite: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { createInvite, revokeInvite } from '@/app/features/invites/store';
import { createInviteAction, revokeInviteAction } from '@/app/(routes)/(dashboard)/invites/actions';

const mockRequireSuperAdmin = requireSuperAdmin as jest.MockedFunction<typeof requireSuperAdmin>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockCreateInvite = createInvite as jest.MockedFunction<typeof createInvite>;
const mockRevokeInvite = revokeInvite as jest.MockedFunction<typeof revokeInvite>;
const mockRecordAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const ACTOR_ID = 'actor-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireSuperAdmin.mockResolvedValue({ userId: ACTOR_ID });
  mockGetUser.mockResolvedValue({ emails: ['admin@test.com'] } as Awaited<
    ReturnType<typeof SuperTokens.getUser>
  >);
  mockCreateInvite.mockResolvedValue({
    id: 'inv-1',
    token: 'tok-1',
    email: 'new@admin.com',
    createdBy: ACTOR_ID,
    createdByEmail: 'admin@test.com',
    createdAt: 1000,
    expiresAt: 2000,
  });
  mockRevokeInvite.mockResolvedValue(undefined);
  mockRecordAudit.mockResolvedValue(undefined);
});

describe('createInviteAction', () => {
  it('returns error for missing email', async () => {
    const result = await createInviteAction(formData({ email: '' }));
    expect(result.error).toBeTruthy();
    expect(mockCreateInvite).not.toHaveBeenCalled();
  });

  it('returns error for invalid email (no @)', async () => {
    const result = await createInviteAction(formData({ email: 'notanemail' }));
    expect(result.error).toBeTruthy();
  });

  it('returns error for invalid email (no domain dot)', async () => {
    const result = await createInviteAction(formData({ email: 'a@b' }));
    expect(result.error).toBeTruthy();
  });

  it('creates invite and returns URL for valid email', async () => {
    const result = await createInviteAction(formData({ email: 'new@admin.com' }));
    expect(result.error).toBeUndefined();
    expect(result.inviteUrl).toBe('https://admin.test/accept-invite?token=tok-1');
    expect(mockCreateInvite).toHaveBeenCalledWith({
      email: 'new@admin.com',
      createdBy: ACTOR_ID,
      createdByEmail: 'admin@test.com',
    });
  });

  it('lowercases the email before creating', async () => {
    await createInviteAction(formData({ email: 'New@Admin.COM' }));
    expect(mockCreateInvite).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@admin.com' })
    );
  });

  it('records an audit event on success', async () => {
    await createInviteAction(formData({ email: 'new@admin.com' }));
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invite.create', targetId: 'inv-1' })
    );
  });
});

describe('revokeInviteAction', () => {
  it('does nothing for missing inviteId', async () => {
    await revokeInviteAction(formData({ inviteId: '' }));
    expect(mockRevokeInvite).not.toHaveBeenCalled();
  });

  it('revokes invite and records audit event', async () => {
    await revokeInviteAction(formData({ inviteId: 'inv-1' }));
    expect(mockRevokeInvite).toHaveBeenCalledWith({ inviteId: 'inv-1', revokedBy: ACTOR_ID });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'invite.revoke', targetId: 'inv-1' })
    );
  });
});
