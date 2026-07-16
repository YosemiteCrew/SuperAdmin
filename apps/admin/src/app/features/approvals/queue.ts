import 'server-only';

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

import { deriveApprovalState, type ApprovalStatus } from './store';

export interface QueueUser {
  id: string;
  emails: string[];
  timeJoined: number;
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
