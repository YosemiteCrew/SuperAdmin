import 'server-only';

import { prisma } from '@superadmin/database';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { logger } from '@/app/lib/logger';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalState {
  status: ApprovalStatus;
  approvedAt?: number;
  approvedBy?: string;
  rejectedAt?: number;
  rejectedBy?: string;
}

type IndexableApprovalRow = {
  id: string;
  status: ApprovalStatus;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Returns indexed statuses for the requested candidate window. Missing rows
 * remain distinguishable from genuinely pending accounts so callers can repair
 * only the gaps from UserMetadata.
 */
export async function getIndexedApprovalStatuses(
  userIds: string[]
): Promise<Map<string, ApprovalStatus>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.approvalStatusIndex.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, status: true },
  });
  return new Map(
    rows
      .filter((row): row is { userId: string; status: ApprovalStatus } =>
        ['pending', 'approved', 'rejected'].includes(row.status)
      )
      .map((row) => [row.userId, row.status])
  );
}

/**
 * Repairs the derived index from metadata rows that were read successfully.
 */
export async function refreshApprovalStatusIndex(rows: IndexableApprovalRow[]): Promise<boolean> {
  try {
    await Promise.all(
      rows.map((row) =>
        prisma.approvalStatusIndex.upsert({
          where: { userId: row.id },
          update: { status: row.status },
          create: { userId: row.id, status: row.status },
        })
      )
    );
    return true;
  } catch (error) {
    logger.error('Approval decision index refresh failed', { error: errorMessage(error) });
    return false;
  }
}

type DecisionOutcome<T> = { applied: false } | { applied: true; value: T };

async function withApprovalDecisionLock<T>(userId: string, run: () => Promise<T>): Promise<T> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing required server env var: DATABASE_URL.');

  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const lockName = `approval:${userId}`;
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockName]);
    return await run();
  } finally {
    try {
      await client.end();
    } catch (error) {
      logger.error('Approval decision lock release failed', { error: errorMessage(error) });
    }
  }
}

async function applyApprovalDecision<T>(params: {
  userId: string;
  expectedStatus: ApprovalStatus;
  status: ApprovalStatus;
  update: (metadata: Record<string, unknown>) => Promise<T>;
}): Promise<DecisionOutcome<T>> {
  return withApprovalDecisionLock(params.userId, async () => {
    const { metadata } = await UserMetadataNode.getUserMetadata(params.userId);
    if (deriveApprovalState(metadata).status !== params.expectedStatus) return { applied: false };

    const outcome: DecisionOutcome<T> = { applied: true, value: await params.update(metadata) };
    try {
      await prisma.approvalStatusIndex.upsert({
        where: { userId: params.userId },
        update: { status: params.status },
        create: { userId: params.userId, status: params.status },
      });
    } catch (error) {
      // The metadata decision is authoritative and cannot be rolled back if the
      // derived index write fails. The queue repairs gaps.
      logger.error('Approval decision index write failed', { error: errorMessage(error) });
    }
    return outcome;
  });
}

/**
 * Approval state is derived from the user's own metadata. Rejection takes
 * precedence over approval so a rejected-then-tampered record still reads as
 * rejected; a clean re-approval clears the rejection fields explicitly.
 */
export function deriveApprovalState(metadata: Record<string, unknown>): ApprovalState {
  const approvedAt = typeof metadata.approvedAt === 'number' ? metadata.approvedAt : undefined;
  const approvedBy = typeof metadata.approvedBy === 'string' ? metadata.approvedBy : undefined;
  const rejectedAt = typeof metadata.rejectedAt === 'number' ? metadata.rejectedAt : undefined;
  const rejectedBy = typeof metadata.rejectedBy === 'string' ? metadata.rejectedBy : undefined;

  if (rejectedAt !== undefined) {
    return { status: 'rejected', rejectedAt, rejectedBy, approvedAt, approvedBy };
  }
  if (approvedAt !== undefined) {
    return { status: 'approved', approvedAt, approvedBy };
  }
  return { status: 'pending' };
}

export async function getApprovalState(userId: string): Promise<ApprovalState> {
  const { metadata } = await UserMetadataNode.getUserMetadata(userId);
  return deriveApprovalState(metadata);
}

export type ApproveResult =
  | { applied: false }
  | {
      applied: true;
      /** True when a disable unrelated to rejection is still blocking sign-in. */
      stillDisabled: boolean;
    };

export async function approveAccount(params: {
  userId: string;
  actorId: string;
  expectedStatus: ApprovalStatus;
}): Promise<ApproveResult> {
  const result = await applyApprovalDecision({
    userId: params.userId,
    expectedStatus: params.expectedStatus,
    status: 'approved',
    update: async (metadata) => {
      // Only a disable that THIS feature created (marked rejectionDisabled) is
      // lifted on approval. A manual disable is deliberately left in place.
      const rejectionOwnsDisable = metadata.rejectionDisabled === true;
      const hasDisable = typeof metadata.disabledAt === 'number';

      await UserMetadataNode.updateUserMetadata(params.userId, {
        approvedAt: Date.now(),
        approvedBy: params.actorId,
        rejectedAt: null,
        rejectedBy: null,
        rejectionDisabled: null,
        ...(rejectionOwnsDisable ? { disabledAt: null, disabledBy: null } : {}),
      });

      return hasDisable && !rejectionOwnsDisable;
    },
  });

  return result.applied ? { applied: true, stillDisabled: result.value } : { applied: false };
}

export async function rejectAccount(params: {
  userId: string;
  actorId: string;
  expectedStatus: ApprovalStatus;
}): Promise<boolean> {
  const result = await applyApprovalDecision({
    userId: params.userId,
    expectedStatus: params.expectedStatus,
    status: 'rejected',
    update: async (metadata) => {
      // Rejection fails closed via the existing disabledAt sign-in gate — but a
      // pre-existing manual disable is preserved so its evidence survives.
      const alreadyDisabled = typeof metadata.disabledAt === 'number';
      const now = Date.now();

      await UserMetadataNode.updateUserMetadata(params.userId, {
        rejectedAt: now,
        rejectedBy: params.actorId,
        approvedAt: null,
        approvedBy: null,
        ...(alreadyDisabled
          ? {}
          : { disabledAt: now, disabledBy: params.actorId, rejectionDisabled: true }),
      });
    },
  });

  return result.applied;
}
