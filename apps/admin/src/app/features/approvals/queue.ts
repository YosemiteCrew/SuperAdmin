import 'server-only';

import supertokens from 'supertokens-node';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { DEFAULT_TENANT_ID } from '@/app/constants';
import { recipeIdsForUserType } from '@/app/features/users/filter';

import { deriveApprovalState, type ApprovalStatus } from './store';

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

/**
 * Annotates an already-fetched user page with approval statuses. A failed
 * metadata read renders as pending rather than blocking the whole list.
 */
export async function annotateApprovalStatuses(users: QueueUser[]): Promise<QueueRow[]> {
  return Promise.all(
    users.map(async (user) => {
      let state = deriveApprovalState({});
      try {
        const { metadata } = await UserMetadataNode.getUserMetadata(user.id);
        state = deriveApprovalState(metadata);
      } catch {
        /* metadata read must not block the queue; unknown reads as pending */
      }
      return {
        id: user.id,
        email: user.emails[0] ?? user.id,
        joinedAt: user.timeJoined,
        status: state.status,
        decidedAt: state.approvedAt ?? state.rejectedAt,
      };
    })
  );
}

export function countPending(rows: QueueRow[]): number {
  return rows.filter((r) => r.status === 'pending').length;
}
