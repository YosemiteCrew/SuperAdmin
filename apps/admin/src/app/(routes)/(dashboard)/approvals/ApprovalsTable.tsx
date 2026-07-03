'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { MAX_BULK } from '@/app/features/approvals/constants';
import type { QueueRow } from '@/app/features/approvals/queue';
import type { ApprovalStatus } from '@/app/features/approvals/store';

import { ApprovalRowActions } from './ApprovalRowActions';
import { bulkApproveAccountsAction, bulkRejectAccountsAction } from './bulkActions';

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
};

// Pinned to UTC: this renders on the server AND hydrates in the browser, so a
// timezone-dependent format would produce hydration mismatches.
function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

interface Feedback {
  kind: 'success' | 'error';
  message: string;
}

export function ApprovalsTable({
  rows,
  emptyMessage = 'No accounts match.',
}: Readonly<{ rows: QueueRow[]; emptyMessage?: string }>) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const pendingRows = rows.filter((r) => r.status === 'pending');
  const pendingIds = new Set(pendingRows.map((r) => r.id));
  // Selection is always reconciled against server truth: an id whose row left
  // 'pending' (per-row action, another admin, filter change) drops out here,
  // so the bulk bar can never act on — or count — rows that are off screen.
  const selected = new Set(Array.from(selectedIds).filter((id) => pendingIds.has(id)));
  const allPendingSelected =
    pendingRows.length > 0 && pendingRows.slice(0, MAX_BULK).every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelectedIds(() => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    // Select-all mirrors the server's batch ceiling so confirm can never
    // promise more than one batch is allowed to process.
    setSelectedIds(
      allPendingSelected ? new Set() : new Set(pendingRows.slice(0, MAX_BULK).map((r) => r.id))
    );
  }

  function runBulk(decision: 'approve' | 'reject') {
    const ids = Array.from(selected);
    const verb = decision === 'approve' ? 'Approve' : 'Reject';
    const detail =
      decision === 'reject'
        ? ' Rejected accounts are disabled and signed out everywhere.'
        : ' Approved accounts receive a welcome email.';
    if (
      !globalThis.confirm(`${verb} ${ids.length} account${ids.length === 1 ? '' : 's'}?${detail}`)
    ) {
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result =
        decision === 'approve'
          ? await bulkApproveAccountsAction(ids)
          : await bulkRejectAccountsAction(ids);

      if (result.error) {
        setFeedback({ kind: 'error', message: result.error });
        return;
      }
      const parts = [`${result.processed} ${decision === 'approve' ? 'approved' : 'rejected'}`];
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      if (result.failed) parts.push(`${result.failed} failed`);
      if (result.emailsSent !== undefined) parts.push(`${result.emailsSent} emails sent`);
      setFeedback({ kind: 'success', message: parts.join(', ') });
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-line bg-raised px-4 py-2.5">
          <p className="text-sm text-ink">
            {selected.size} selected
            {pendingRows.length > MAX_BULK ? (
              <span className="ml-2 text-xs text-ink-3">(max {MAX_BULK} per batch)</span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runBulk('approve')}
              disabled={pending}
              className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-50"
            >
              {pending ? 'Working…' : `Approve ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => runBulk('reject')}
              disabled={pending}
              className="rounded-lg border border-danger-600 px-3 py-1.5 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-50"
            >
              {pending ? 'Working…' : `Reject ${selected.size}`}
            </button>
          </div>
        </div>
      ) : null}

      <p
        role="status"
        aria-live="polite"
        className={
          feedback
            ? feedback.kind === 'error'
              ? 'text-sm text-red-500'
              : 'text-sm text-emerald-600 dark:text-emerald-400'
            : 'sr-only'
        }
      >
        {feedback?.message ?? ''}
      </p>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">{emptyMessage}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="w-10 px-5 py-3">
                  {pendingRows.length > 0 ? (
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleAll}
                      aria-label="Select all pending accounts"
                      className="h-4 w-4 rounded border-line accent-btn"
                    />
                  ) : null}
                </th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    {row.status === 'pending' ? (
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.email}`}
                        className="h-4 w-4 rounded border-line accent-btn"
                      />
                    ) : null}
                  </td>
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
