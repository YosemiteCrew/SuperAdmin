import type { Metadata } from 'next';
import Link from 'next/link';
import supertokens from 'supertokens-node';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { annotateApprovalStatuses, countPending } from '@/app/features/approvals/queue';
import type { ApprovalStatus } from '@/app/features/approvals/store';

import { ApprovalRowActions } from './ApprovalRowActions';

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

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
          disables the account and signs it out everywhere.
        </p>
      </header>

      <nav className="flex items-center gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'pending' ? '/approvals' : `/approvals?status=${f.key}`}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filter === f.key
                ? 'border-btn bg-btn text-btn-fg'
                : 'border-line bg-surface text-ink hover:bg-raised'
            }`}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        {visible.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">
            {filter === 'pending' ? 'No accounts waiting for approval.' : 'No accounts match.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/users/${row.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {row.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-2">
                    <time dateTime={new Date(row.joinedAt).toISOString()}>
                      {formatDate(row.joinedAt)}
                    </time>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                    {row.decidedAt ? (
                      <span className="ml-2 text-xs text-ink-3">{formatDate(row.decidedAt)}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.status === 'pending' ? (
                      <ApprovalRowActions userId={row.id} email={row.email} />
                    ) : (
                      <span className="text-xs text-ink-3">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
