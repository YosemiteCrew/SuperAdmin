import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { annotateApprovalStatuses, countPending } from '@/app/features/approvals/queue';
import type { ApprovalStatus } from '@/app/features/approvals/store';

import { ApprovalsTable } from './ApprovalsTable';

export const metadata: Metadata = { title: 'Account approvals' };

const SCAN_LIMIT = 100;
const DEFAULT_TENANT = 'public';

type StatusFilter = ApprovalStatus | 'all';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export default async function ApprovalsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string }> }>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { status } = await searchParams;
  const filter: StatusFilter = FILTERS.some((f) => f.key === status)
    ? (status as StatusFilter)
    : 'pending';

  const { users } = await supertokens.getUsersNewestFirst({
    tenantId: DEFAULT_TENANT,
    limit: SCAN_LIMIT,
  });

  const rows = await annotateApprovalStatuses(users);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const pendingCount = countPending(rows);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Account approvals</h1>
        <p className="text-sm text-ink-3">
          Review the newest {SCAN_LIMIT} accounts. Approving sends a welcome email; rejecting
          disables the account and signs it out everywhere. Select rows to act in bulk.
        </p>
      </header>

      <nav className="flex items-center gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'pending' ? '/approvals' : `/approvals?status=${f.key}`}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filter === f.key
                ? 'border-btn bg-btn text-btn-ink'
                : 'border-line bg-surface text-ink hover:bg-raised'
            }`}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Link>
        ))}
      </nav>

      {/* Keyed by filter so a stale selection can never follow the admin
          across filter views; kept mounted on revalidation so bulk feedback
          survives the pending list going empty. */}
      <ApprovalsTable
        key={filter}
        rows={visible}
        emptyMessage={
          filter === 'pending' ? 'No accounts waiting for approval.' : 'No accounts match.'
        }
      />
    </div>
  );
}
