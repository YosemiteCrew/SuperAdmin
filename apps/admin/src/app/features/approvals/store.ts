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

async function indexApprovalStatus(userId: string, status: ApprovalStatus): Promise<void> {
  try {
    await prisma.approvalStatusIndex.upsert({
      where: { userId },
      update: { status },
      create: { userId, status },
    });
  } catch (error) {
    // Derived-state failure must never undo or block the authoritative decision.
    // A missing row can only over-count pending work, and /approvals repairs it.
    logger.error('Approval decision index write failed', { userId, error: errorMessage(error) });
  }
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

export interface ApproveResult {
  /** True when a disable unrelated to rejection is still blocking sign-in. */
  stillDisabled: boolean;
}

export async function approveAccount(params: {
  userId: string;
  actorId: string;
}): Promise<ApproveResult> {
  const { metadata } = await UserMetadataNode.getUserMetadata(params.userId);
  // Only a disable that THIS feature created (marked rejectionDisabled) is
  // lifted on approval. A manual disable — set via the users page before or
  // after any rejection — is deliberately left in place.
  const rejectionOwnsDisable = metadata.rejectionDisabled === true;
  const hasDisable = typeof metadata.disabledAt === 'number';

  await UserMetadataNode.updateUserMetadata(params.userId, {
    approvedAt: Date.now(),
    approvedBy: params.actorId,
    // Clearing a field requires an explicit null in SuperTokens metadata.
    rejectedAt: null,
    rejectedBy: null,
    rejectionDisabled: null,
    ...(rejectionOwnsDisable ? { disabledAt: null, disabledBy: null } : {}),
  });

  await indexApprovalStatus(params.userId, 'approved');

  return { stillDisabled: hasDisable && !rejectionOwnsDisable };
}

export async function rejectAccount(params: { userId: string; actorId: string }): Promise<void> {
  const { metadata } = await UserMetadataNode.getUserMetadata(params.userId);
  // Rejection fails closed via the existing disabledAt sign-in gate — but a
  // pre-existing manual disable is preserved, not overwritten, so the original
  // timestamp/actor evidence survives and approval can never lift it.
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

  await indexApprovalStatus(params.userId, 'rejected');
}
