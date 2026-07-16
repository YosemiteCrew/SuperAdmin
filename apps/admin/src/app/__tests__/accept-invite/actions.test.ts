jest.mock('server-only', () => ({}));

const redirectMock = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: (...a: unknown[]) => redirectMock(...a),
}));

jest.mock('@/app/config/backend', () => ({
  ensureSuperTokensInit: jest.fn(),
  getAuthenticatedSession: jest.fn(),
}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));

jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { addRoleToUser: jest.fn() },
}));

jest.mock('@/app/features/audit/store', () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock('@/app/features/invites/store', () => ({
  getInviteByToken: jest.fn(),
  markInviteUsed: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { acceptInviteAction } from '@/app/(routes)/(dashboard)/accept-invite/actions';
import { getAuthenticatedSession } from '@/app/config/backend';
import { DEFAULT_TENANT_ID, SUPERADMIN_ROLE } from '@/app/constants';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getInviteByToken, markInviteUsed } from '@/app/features/invites/store';
import type { InviteRecord } from '@/app/features/invites/types';

const mockGetSession = getAuthenticatedSession as jest.MockedFunction<
  typeof getAuthenticatedSession
>;
const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockAddRole = UserRolesNode.addRoleToUser as jest.MockedFunction<
  typeof UserRolesNode.addRoleToUser
>;
const mockGetInvite = getInviteByToken as jest.MockedFunction<typeof getInviteByToken>;
const mockMarkUsed = markInviteUsed as jest.MockedFunction<typeof markInviteUsed>;
const mockRecordAudit = recordAuditEvent as jest.MockedFunction<typeof recordAuditEvent>;

const NOW = 1_700_000_000_000;

function invite(over: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: 'inv-1',
    token: 'tok-1',
    email: 'new@x.com',
    createdBy: 'admin-1',
    createdByEmail: 'admin@x.com',
    createdAt: NOW - 1000,
    expiresAt: NOW + 86_400_000,
    ...over,
  };
}

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockGetInvite.mockResolvedValue(invite());
  mockGetSession.mockResolvedValue({ userId: 'u-9' } as Awaited<
    ReturnType<typeof getAuthenticatedSession>
  >);
  mockGetUser.mockResolvedValue({ emails: ['new@x.com'] } as Awaited<
    ReturnType<typeof SuperTokens.getUser>
  >);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Every rejection path must leave the caller without the super-admin role. */
function expectNoGrant() {
  expect(mockAddRole).not.toHaveBeenCalled();
  expect(mockMarkUsed).not.toHaveBeenCalled();
  expect(redirectMock).not.toHaveBeenCalled();
}

describe('acceptInviteAction', () => {
  it('grants the role, marks the invite used, audits it, and redirects', async () => {
    await acceptInviteAction(formData({ token: 'tok-1' }));

    expect(mockAddRole).toHaveBeenCalledWith(DEFAULT_TENANT_ID, 'u-9', SUPERADMIN_ROLE);
    expect(mockMarkUsed).toHaveBeenCalledWith({
      token: 'tok-1',
      usedBy: 'u-9',
      usedByEmail: 'new@x.com',
    });
    expect(mockRecordAudit).toHaveBeenCalledWith({
      action: 'invite.use',
      actorId: 'u-9',
      targetType: 'invite',
      targetId: 'inv-1',
      targetLabel: 'new@x.com',
    });
    expect(redirectMock).toHaveBeenCalledWith('/dashboard');
  });

  it('grants the role only after the invite is validated', async () => {
    // Ordering matters: a revoked or expired invite must never reach addRoleToUser.
    mockGetInvite.mockResolvedValue(invite({ revokedAt: NOW - 1 }));
    await acceptInviteAction(formData({ token: 'tok-1' }));
    expectNoGrant();
  });

  it.each([
    ['a missing token', {}, 'Invalid invite token.'],
    ['an empty token', { token: '   ' }, 'Invalid invite token.'],
  ])('rejects %s', async (_label, fields, message) => {
    const result = await acceptInviteAction(formData(fields as Record<string, string>));
    expect(result).toEqual({ error: message });
    expect(mockGetInvite).not.toHaveBeenCalled();
    expectNoGrant();
  });

  it('rejects an unknown token', async () => {
    mockGetInvite.mockResolvedValue(null);
    const result = await acceptInviteAction(formData({ token: 'nope' }));
    expect(result).toEqual({ error: 'Invite not found or already used.' });
    expectNoGrant();
  });

  it('rejects an expired invite with a renewal hint', async () => {
    mockGetInvite.mockResolvedValue(invite({ expiresAt: NOW - 1 }));
    const result = await acceptInviteAction(formData({ token: 'tok-1' }));
    expect(result.error).toMatch(/expired/i);
    expectNoGrant();
  });

  it('rejects a revoked invite', async () => {
    mockGetInvite.mockResolvedValue(invite({ revokedAt: NOW - 1 }));
    const result = await acceptInviteAction(formData({ token: 'tok-1' }));
    expect(result).toEqual({ error: 'This invite has been revoked.' });
    expectNoGrant();
  });

  it('rejects an already-used invite', async () => {
    mockGetInvite.mockResolvedValue(invite({ usedAt: NOW - 1, usedBy: 'someone' }));
    const result = await acceptInviteAction(formData({ token: 'tok-1' }));
    expect(result).toEqual({ error: 'This invite has already been used.' });
    expectNoGrant();
  });

  it('falls back to the user id when the account has no email', async () => {
    mockGetUser.mockResolvedValue(undefined);
    await acceptInviteAction(formData({ token: 'tok-1' }));
    expect(mockMarkUsed).toHaveBeenCalledWith({
      token: 'tok-1',
      usedBy: 'u-9',
      usedByEmail: 'u-9',
    });
    expect(mockRecordAudit).toHaveBeenCalledWith(expect.objectContaining({ targetLabel: 'u-9' }));
  });

  it('audits the accepting user as the actor, not the inviter', async () => {
    // This event is the privilege escalation itself, so the actor has to be the
    // account that gained super-admin. Attributing it to the inviter would keep
    // the escalation out of the new admin's own activity feed and leave them
    // recorded only as a denormalised label. The inviter stays recoverable
    // through targetId -> the invite's createdBy.
    mockGetInvite.mockResolvedValue(invite({ createdBy: 'admin-7' }));
    await acceptInviteAction(formData({ token: 'tok-1' }));
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'u-9', targetType: 'invite', targetId: 'inv-1' })
    );
  });
});
