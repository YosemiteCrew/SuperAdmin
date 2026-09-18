import 'server-only';

import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { DEFAULT_TENANT_ID } from '@/app/constants';
import { recipeIdsForUserType } from '@/app/features/users/filter';
import { logger } from '@/app/lib/logger';

import {
  deriveApprovalState,
  getIndexedApprovalStatuses,
  refreshApprovalStatusIndex,
  type ApprovalStatus,
} from './store';

export interface QueueUser {
  id: string;
  emails: string[];
  timeJoined: number;
}

/**
 * Only the business web app goes through approval. Its accounts sign in with
 * email + password; pet parents on the mobile app sign in with a one-time code
 * or a social provider and can use the app the moment they sign up, so they
 * must never be listed as waiting for a decision. The split is the same one
 * the users directory uses (see features/users/filter.ts).
 */
export const APPROVAL_USER_TYPE = 'business' as const;

/**
 * The newest accounts that are subject to approval. Filtering happens in the
 * SuperTokens core via `includeRecipeIds`, so the window is `limit` business
 * accounts - not `limit` accounts of any kind with the mobile ones dropped,
 * which would shrink the queue by however many pet parents signed up.
 */
export async function fetchApprovalCandidates(limit: number): Promise<QueueUser[]> {
  const { users } = await supertokens.getUsersNewestFirst({
    tenantId: DEFAULT_TENANT_ID,
    limit,
    includeRecipeIds: recipeIdsForUserType(APPROVAL_USER_TYPE),
  });
  return users;
}

export interface QueueRow {
  id: string;
  email: string;
  joinedAt: number;
  status: ApprovalStatus;
  decidedAt?: number;
}

export interface ApprovalStatusScan {
  rows: QueueRow[];
  indexableRows: QueueRow[];
}

/**
 * Annotates an already-fetched user page with approval statuses. A failed
 * metadata read renders as pending rather than blocking the whole list.
 */
export async function scanApprovalStatuses(users: QueueUser[]): Promise<ApprovalStatusScan> {
  const results = await Promise.all(
    users.map(async (user) => {
      let state = deriveApprovalState({});
      let known = false;
      try {
        const { metadata } = await UserMetadataNode.getUserMetadata(user.id);
        state = deriveApprovalState(metadata);
        known = true;
      } catch {
        /* metadata read must not block the queue; unknown reads as pending */
      }
      return {
        known,
        row: {
          id: user.id,
          email: user.emails[0] ?? user.id,
          joinedAt: user.timeJoined,
          status: state.status,
          decidedAt: state.approvedAt ?? state.rejectedAt,
        },
      };
    })
  );
  return {
    rows: results.map(({ row }) => row),
    indexableRows: results.filter(({ known }) => known).map(({ row }) => row),
  };
}

export async function annotateApprovalStatuses(users: QueueUser[]): Promise<QueueRow[]> {
  return (await scanApprovalStatuses(users)).rows;
}

export function countPending(rows: QueueRow[]): number {
  return rows.filter((r) => r.status === 'pending').length;
}

/**
 * Dashboard count with an exact fallback. The initialized index makes the
 * steady-state path a constant number of database reads instead of one
 * metadata request per candidate; missing/unavailable state reuses the recount.
 */
export async function countPendingApprovalCandidates(users: QueueUser[]): Promise<number> {
  try {
    const indexed = await getIndexedApprovalStatuses(users.map((user) => user.id));
    const missing = users.filter((user) => !indexed.has(user.id));
    if (missing.length > 0) {
      const { rows, indexableRows } = await scanApprovalStatuses(missing);
      await refreshApprovalStatusIndex(indexableRows);
      rows.forEach((row) => indexed.set(row.id, row.status));
    }
    return users.filter((user) => indexed.get(user.id) === 'pending').length;
  } catch (error) {
    logger.error('Approval decision index read failed; recounting from metadata', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const { rows, indexableRows } = await scanApprovalStatuses(users);
  await refreshApprovalStatusIndex(indexableRows);
  return countPending(rows);
}
