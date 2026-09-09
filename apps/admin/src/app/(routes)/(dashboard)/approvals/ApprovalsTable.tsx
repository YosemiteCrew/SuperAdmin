'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

import { MAX_BULK } from '@/app/features/approvals/constants';
import type { QueueRow } from '@/app/features/approvals/queue';
import type { ApprovalStatus } from '@/app/features/approvals/store';

import { ApprovalRowActions } from './ApprovalRowActions';
import { bulkApproveAccountsAction, bulkRejectAccountsAction } from './bulkActions';

/**
 * Warm-bone status badges. These mirror the shipped VERIFICATION_META treatment
 * on the organizations screens so a positive/pending/negative status reads the
 * same everywhere: pending as warn, approved as the avatar-green palette,
 * rejected as danger. All resolve through theme-aware CSS variables.
 */
const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: 'border border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  approved:
    'border border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  rejected:
    'border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
};

const BULK_BTN =
  'inline-flex h-[31px] items-center justify-center rounded-full border px-[13px] text-[11.5px] font-semibold transition-colors disabled:opacity-60';

/** Approve reads as a positive status action, so it carries the green outline. */
const APPROVE_BTN =
  'border-[var(--avatar-green-ink)] text-[color:var(--avatar-green-ink)] hover:bg-[var(--avatar-green-bg)]';
const REJECT_BTN =
  'border-[var(--danger-border)] text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)]';

const TH =
  'px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const CARD_FOOT =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';
const CHECKBOX = 'h-4 w-4 rounded-[5px] border-[1.5px] border-[var(--divider)] accent-[var(--cta)]';

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

/**
 * Success is carried by weight rather than colour: warm-bone reserves the green
 * --success token for live/status dots, so a green success line would be the
 * only green text on the screen.
 */
function feedbackClass(feedback: Feedback | null): string {
  if (!feedback) return 'sr-only';
  return feedback.kind === 'error'
    ? 'text-[13px] font-semibold text-[color:var(--danger-text)]'
    : 'text-[13px] font-semibold text-[color:var(--ink)]';
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
        <div className="flex flex-wrap items-center gap-[10px] rounded-[14px] border border-[var(--hairline)] bg-[var(--inset)] px-4 py-[9px]">
          <p className="text-[13px] font-bold text-[color:var(--ink)]">
            {selected.size} selected
            {pendingRows.length > MAX_BULK ? (
              <span className="ml-2 text-[11.5px] font-medium text-[color:var(--ink-faint)]">
                (max {MAX_BULK} per batch)
              </span>
            ) : null}
          </p>
          <div className="ml-auto flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => runBulk('approve')}
              disabled={pending}
              className={`${BULK_BTN} ${APPROVE_BTN}`}
            >
              {pending ? 'Working…' : `Approve ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => runBulk('reject')}
              disabled={pending}
              className={`${BULK_BTN} ${REJECT_BTN}`}
            >
              {pending ? 'Working…' : `Reject ${selected.size}`}
            </button>
          </div>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className={feedbackClass(feedback)}>
        {feedback?.message ?? ''}
      </p>

      <section className="overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
            {emptyMessage}
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-11" />
              <col className="w-[1.8fr]" />
              <col className="w-[1.1fr]" />
              <col className="w-[1.4fr]" />
              <col className="w-[190px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left">
                <th className={TH}>
                  {pendingRows.length > 0 ? (
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleAll}
                      aria-label="Select all pending accounts"
                      className={CHECKBOX}
                    />
                  ) : null}
                </th>
                <th className={TH}>Account</th>
                <th className={TH}>Joined</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-[var(--hairline)] transition-colors last:border-b-0 ${
                    selected.has(row.id)
                      ? 'bg-[var(--nav-active-bg)]'
                      : 'hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <td className="px-5 py-3">
                    {row.status === 'pending' ? (
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.email}`}
                        className={CHECKBOX}
                      />
                    ) : null}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/users/${row.id}`}
                      className="block truncate text-[13.5px] font-semibold text-[color:var(--ink)] hover:underline"
                    >
                      {row.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[13.5px] text-[color:var(--ink-muted)]">
                    <time dateTime={new Date(row.joinedAt).toISOString()}>
                      {formatDate(row.joinedAt)}
                    </time>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex flex-none rounded-full px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] ${STATUS_STYLE[row.status]}`}
                      >
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                      {row.decidedAt ? (
                        <span className="text-[11px] text-[color:var(--ink-faint)]">
                          {formatDate(row.decidedAt)}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.status === 'pending' ? (
                      <ApprovalRowActions userId={row.id} email={row.email} />
                    ) : (
                      <span className="text-[11.5px] text-[color:var(--ink-faint)]">·</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={CARD_FOOT}>
          Bulk results report processed, skipped, failed, and welcome emails sent. A manual disable
          set from the Users page is never lifted by approval.
        </p>
      </section>
    </div>
  );
}
