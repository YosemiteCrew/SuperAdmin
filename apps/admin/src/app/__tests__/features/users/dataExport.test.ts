jest.mock('server-only', () => ({}));

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { getUser: jest.fn() },
}));
jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { getAllSessionHandlesForUser: jest.fn() },
}));
jest.mock('supertokens-node/recipe/usermetadata', () => ({
  __esModule: true,
  default: { getUserMetadata: jest.fn() },
}));
jest.mock('supertokens-node/recipe/userroles', () => ({
  __esModule: true,
  default: { getRolesForUser: jest.fn() },
}));
jest.mock('@/app/features/audit/store', () => ({
  readAuditEventsInvolving: jest.fn(),
}));

import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { readAuditEventsInvolving } from '@/app/features/audit/store';
import type { AuditEvent } from '@/app/features/audit/types';
import { collectAccountData } from '@/app/features/users/dataExport';

const mockGetUser = SuperTokens.getUser as jest.MockedFunction<typeof SuperTokens.getUser>;
const mockSessions = SessionNode.getAllSessionHandlesForUser as jest.MockedFunction<
  typeof SessionNode.getAllSessionHandlesForUser
>;
const mockMeta = UserMetadataNode.getUserMetadata as jest.MockedFunction<
  typeof UserMetadataNode.getUserMetadata
>;
const mockRoles = UserRolesNode.getRolesForUser as jest.MockedFunction<
  typeof UserRolesNode.getRolesForUser
>;
const mockAudit = readAuditEventsInvolving as jest.MockedFunction<typeof readAuditEventsInvolving>;

type StUser = Awaited<ReturnType<typeof SuperTokens.getUser>>;

const USER = {
  id: 'u1',
  emails: ['pet@owner.com'],
  timeJoined: 1_700_000_000_000,
  loginMethods: [{ recipeId: 'emailpassword' }, { recipeId: 'emailpassword' }],
  tenantIds: ['public'],
} as unknown as StUser;

function event(over: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'e1',
    action: 'user.disable',
    actorId: 'admin-9',
    actorEmail: 'admin@yc.com',
    targetType: 'user',
    targetId: 'u1',
    targetLabel: 'pet@owner.com',
    at: 1_700_000_100_000,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue(USER);
  mockSessions.mockResolvedValue(['s1', 's2']);
  mockMeta.mockResolvedValue({ status: 'OK', metadata: { lastSignInAt: 123 } });
  mockRoles.mockResolvedValue({ status: 'OK', roles: ['superadmin'] });
  mockAudit.mockResolvedValue({ asTarget: [], asActor: [] });
});

describe('collectAccountData', () => {
  it('returns null for an unknown account', async () => {
    mockGetUser.mockResolvedValue(undefined as unknown as StUser);
    expect(await collectAccountData('ghost')).toBeNull();
  });

  it('assembles every section of the bundle', async () => {
    const data = await collectAccountData('u1');

    expect(data).not.toBeNull();
    expect(data?.account).toEqual({
      id: 'u1',
      emails: ['pet@owner.com'],
      timeJoined: new Date(1_700_000_000_000).toISOString(),
      loginMethods: ['emailpassword'],
      tenantIds: ['public'],
    });
    expect(data?.metadata).toEqual({ lastSignInAt: 123 });
    expect(data?.roles).toEqual(['superadmin']);
    expect(data?.activeSessionCount).toBe(2);
    expect(data?.auditTrail).toEqual({ asTarget: [], asActor: [] });
    expect(typeof data?.exportedAt).toBe('string');
  });

  it('redacts admin identities from events performed ON the subject', async () => {
    mockAudit.mockResolvedValue({
      asTarget: [event({ actorId: 'admin-9', actorEmail: 'admin@yc.com' })],
      asActor: [],
    });

    const data = await collectAccountData('u1');
    const trail = data?.auditTrail as unknown as { asTarget: Record<string, unknown>[] };
    const entry = trail.asTarget[0];

    expect(entry.performedBy).toBe('super-admin');
    expect(entry.subjectLabel).toBe('pet@owner.com');
    // No third-party identifiers anywhere in the entry.
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('admin-9');
    expect(serialized).not.toContain('admin@yc.com');
  });

  it('redacts other users from events performed BY the subject', async () => {
    mockAudit.mockResolvedValue({
      asTarget: [],
      asActor: [
        event({
          actorId: 'u1',
          actorEmail: 'pet@owner.com',
          targetId: 'other-user',
          targetLabel: 'other@person.com',
        }),
      ],
    });

    const data = await collectAccountData('u1');
    const trail = data?.auditTrail as unknown as { asActor: Record<string, unknown>[] };
    const entry = trail.asActor[0];

    expect(entry.action).toBe('user.disable');
    expect(entry.targetType).toBe('user');
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain('other-user');
    expect(serialized).not.toContain('other@person.com');
  });

  it('degrades a failed section to an error string without sinking the export', async () => {
    mockMeta.mockRejectedValue(new Error('core down'));
    mockRoles.mockRejectedValue(new Error('core down'));

    const data = await collectAccountData('u1');

    expect(data?.metadata).toEqual({ error: expect.stringMatching(/could not be read/) });
    expect(data?.roles).toEqual({ error: expect.stringMatching(/could not be read/) });
    // Healthy sections are unaffected.
    expect(data?.activeSessionCount).toBe(2);
  });

  it('marks the audit trail unreadable when the strict read throws', async () => {
    mockAudit.mockRejectedValue(new Error('metadata store down'));

    const data = await collectAccountData('u1');
    expect(data?.auditTrail).toEqual({ error: expect.stringMatching(/could not be read/) });
  });
});
