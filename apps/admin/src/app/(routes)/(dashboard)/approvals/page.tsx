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

const FILTER_PILL =
  'inline-flex h-[34px] items-center gap-1.5 rounded-full border px-[15px] text-[12.5px] font-semibold transition-colors';
const FILTER_PILL_ON = 'border-[var(--cta)] bg-[var(--cta)] text-[color:var(--cta-text)]';
const FILTER_PILL_OFF =
  'border-[var(--divider)] bg-transparent text-[color:var(--ink-muted)] hover:bg-[var(--surface-soft)]';

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
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Account approvals
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Review the newest {SCAN_LIMIT} accounts. Approving sends a welcome email; rejecting
          disables the account and signs it out everywhere. Select rows to act in bulk.
        </p>
      </header>

      <nav className="flex items-center gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'pending' ? '/approvals' : `/approvals?status=${f.key}`}
            className={`${FILTER_PILL} ${filter === f.key ? FILTER_PILL_ON : FILTER_PILL_OFF}`}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 ? (
              <span className="tabular-nums opacity-65">{pendingCount}</span>
            ) : null}
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
