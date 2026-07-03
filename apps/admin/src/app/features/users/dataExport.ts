import 'server-only';

import SuperTokens from 'supertokens-node';
import SessionNode from 'supertokens-node/recipe/session';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import UserRolesNode from 'supertokens-node/recipe/userroles';

import { DEFAULT_TENANT_ID } from '@/app/constants';
import { readAuditEventsInvolving } from '@/app/features/audit/store';
import type { AuditEvent } from '@/app/features/audit/types';

/**
 * An audit entry as disclosed to the data subject. Third-party identifiers are
 * redacted per GDPR Art. 15(4): events ON the subject name no admin (reduced
 * to a role), and events BY the subject name no other user (target identity
 * stripped, keeping only the action and target kind).
 */
export interface SubjectAuditEntry {
  id: string;
  action: string;
  at: string;
  targetType: string;
  /** Only on asTarget entries — the subject's own label at record time. */
  subjectLabel?: string;
  /** Only on asTarget entries — always the role, never an identity. */
  performedBy?: 'super-admin';
}

/**
 * Everything the platform durably holds about one account, assembled for a
 * GDPR subject-access request. Each section degrades independently: a failed
 * read reports an error string for that section rather than sinking the export.
 */
export interface AccountDataExport {
  exportedAt: string;
  account: {
    id: string;
    emails: string[];
    timeJoined: string;
    loginMethods: string[];
    tenantIds: string[];
  };
  metadata: Record<string, unknown> | { error: string };
  roles: string[] | { error: string };
  activeSessionCount: number | { error: string };
  auditTrail:
    | {
        asTarget: SubjectAuditEntry[];
        asActor: SubjectAuditEntry[];
      }
    | { error: string };
}

const AUDIT_EXPORT_LIMIT = 250;

async function section<T>(read: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await read();
  } catch {
    return { error: 'This section could not be read at export time.' };
  }
}

function redactAsTarget(event: AuditEvent): SubjectAuditEntry {
  return {
    id: event.id,
    action: event.action,
    at: new Date(event.at).toISOString(),
    targetType: event.targetType,
    subjectLabel: event.targetLabel,
    performedBy: 'super-admin',
  };
}

function redactAsActor(event: AuditEvent): SubjectAuditEntry {
  // The subject performed this action; who it was performed ON is another
  // data subject and is deliberately not disclosed.
  return {
    id: event.id,
    action: event.action,
    at: new Date(event.at).toISOString(),
    targetType: event.targetType,
  };
}

export async function collectAccountData(userId: string): Promise<AccountDataExport | null> {
  const user = await SuperTokens.getUser(userId);
  if (!user) return null;

  const [metadata, roles, activeSessionCount, auditTrail] = await Promise.all([
    section(async () => {
      const { metadata: m } = await UserMetadataNode.getUserMetadata(userId);
      return m;
    }),
    section(async () => {
      const { roles: r } = await UserRolesNode.getRolesForUser(DEFAULT_TENANT_ID, userId);
      return r;
    }),
    section(async () => {
      const handles = await SessionNode.getAllSessionHandlesForUser(userId);
      return handles.length;
    }),
    section(async () => {
      const { asTarget, asActor } = await readAuditEventsInvolving(userId, AUDIT_EXPORT_LIMIT);
      return {
        asTarget: asTarget.map(redactAsTarget),
        asActor: asActor.map(redactAsActor),
      };
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      emails: user.emails,
      timeJoined: new Date(user.timeJoined).toISOString(),
      loginMethods: Array.from(new Set(user.loginMethods.map((m) => m.recipeId))),
      tenantIds: user.tenantIds,
    },
    metadata,
    roles,
    activeSessionCount,
    auditTrail,
  };
}
