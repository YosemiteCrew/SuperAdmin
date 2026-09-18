import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/app/config/env.server';
import {
  countPending,
  fetchApprovalCandidates,
  scanApprovalStatuses,
} from '@/app/features/approvals/queue';
import { refreshApprovalStatusIndex } from '@/app/features/approvals/store';
import { constantTimeEquals } from '@/app/features/social/secrets';

const KEY_HEADER = 'x-scheduler-key';
const SCAN_LIMIT = 100;

/** Rebuilds the derived dashboard index from authoritative UserMetadata. */
export async function POST(request: NextRequest): Promise<Response> {
  const expected = serverEnv.socialSchedulerKey;
  if (!expected) {
    return NextResponse.json({ error: 'Scheduled reconciliation is not enabled' }, { status: 503 });
  }
  if (!constantTimeEquals(expected, request.headers.get(KEY_HEADER) ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await fetchApprovalCandidates(SCAN_LIMIT);
  const { rows, indexableRows } = await scanApprovalStatuses(users);
  const refreshed = await refreshApprovalStatusIndex(indexableRows);

  if (!refreshed || indexableRows.length !== rows.length) {
    return NextResponse.json(
      { error: 'Approval reconciliation was incomplete', indexed: indexableRows.length },
      { status: 502 }
    );
  }

  return NextResponse.json({ indexed: rows.length, pending: countPending(rows) });
}
