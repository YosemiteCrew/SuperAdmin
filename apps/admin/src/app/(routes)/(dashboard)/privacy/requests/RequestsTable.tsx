'use client';

import { useActionState } from 'react';
import type { DataRequest } from '@superadmin/database';

import {
  daysUntilDue,
  isOpenStatus,
  isOverdue,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  type DataRequestStatus,
} from '@/app/features/dataRequests/types';
import { logDataRequestAction, updateDataRequestStatusAction } from './actions';
import type { ActionResult } from './actions';

const TYPE_LABELS: Record<string, string> = {
  access: 'Access',
  erasure: 'Erasure',
  rectification: 'Rectification',
  objection: 'Objection',
};

const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const TH =
  'px-[18px] py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-[18px] py-3 text-[13.5px] text-[color:var(--ink-muted)]';
const BADGE =
  'inline-flex items-center rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';
const FIELD =
  'h-[38px] rounded-[11px] border-[1.5px] border-[color:var(--hairline)] bg-[var(--field-bg)] px-3 text-[13px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint2)] focus:border-[color:var(--blue)]';
const FIELD_LABEL = 'text-[11px] font-semibold text-[color:var(--ink-soft)]';
const FOOTER_NOTE =
  'border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]';
const NEUTRAL_PILL = 'border-[var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]';

const STATUS_STYLES: Record<DataRequestStatus, string> = {
  received: 'border-[var(--blue)]/30 bg-[var(--blue-soft)] text-[color:var(--blue-text)]',
  in_progress: 'border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  fulfilled:
    'border-[var(--avatar-green-ink)]/30 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]',
  rejected: NEUTRAL_PILL,
};

const STATUS_LABELS: Record<DataRequestStatus, string> = {
  received: 'Received',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  rejected: 'Rejected',
};

function StatusBadge({ status }: { readonly status: DataRequestStatus }) {
  return <span className={`${BADGE} ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

/** Deadline pill: red when overdue, amber when due within a week, else muted. */
function DeadlineBadge({
  dueAt,
  status,
  nowMs,
}: {
  readonly dueAt: Date;
  readonly status: DataRequestStatus;
  readonly nowMs: number;
}) {
  const now = new Date(nowMs);
  if (!isOpenStatus(status)) {
    return <span className={`${BADGE} tracking-[0.06em] ${NEUTRAL_PILL}`}>Closed</span>;
  }
  const days = daysUntilDue(dueAt, now);
  if (isOverdue(dueAt, status, now)) {
    const overdueBy = Math.abs(days);
    return (
      <span
        className={`${BADGE} tracking-[0.06em] border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]`}
      >
        Overdue by {overdueBy} {overdueBy === 1 ? 'day' : 'days'}
      </span>
    );
  }
  const soon = days <= 7;
  const cls = soon
    ? 'border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]'
    : NEUTRAL_PILL;
  return (
    <span className={`${BADGE} tracking-[0.06em] ${cls}`}>
      Due in {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}

function StatusControl({ request }: { readonly request: DataRequest }) {
  const [result, action, isPending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => updateDataRequestStatusAction(formData),
    null
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={request.id} />
      <label className="sr-only" htmlFor={`status-${request.id}`}>
        Status for {request.subjectEmail}
      </label>
      <select
        id={`status-${request.id}`}
        name="status"
        defaultValue={request.status}
        className="h-[28px] rounded-full border border-[color:var(--hairline)] bg-[var(--field-bg)] px-3 text-[11.5px] font-semibold text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--blue)]"
      >
        {REQUEST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-8 items-center rounded-full border border-[color:var(--divider)] px-[14px] text-[12.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-60"
      >
        {isPending ? 'Saving...' : 'Update'}
      </button>
      {result && !result.ok && (
        <span className="text-[11.5px] text-[color:var(--danger-text)]">{result.error}</span>
      )}
    </form>
  );
}

function LogForm() {
  const [result, action, isPending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => logDataRequestAction(formData),
    null
  );
  return (
    <div className={`${CARD} px-5 py-[14px]`}>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex w-[250px] flex-col gap-1">
          {/* The design puts the card title where this field's label would sit.
              The visible label is kept for screen readers rather than dropped. */}
          <h2 className="text-[11.5px] font-bold text-[color:var(--ink)]">
            Log a data-subject request
          </h2>
          <label htmlFor="dr-email" className="sr-only">
            Subject email
          </label>
          <input
            id="dr-email"
            name="subjectEmail"
            type="email"
            required
            placeholder="person@example.com"
            className={FIELD}
          />
        </div>
        <div className="flex w-[150px] flex-col gap-1">
          <label htmlFor="dr-type" className={FIELD_LABEL}>
            Type
          </label>
          <select id="dr-type" name="type" className={FIELD}>
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="dr-notes" className={FIELD_LABEL}>
            Notes (optional)
          </label>
          <input
            id="dr-notes"
            name="notes"
            placeholder="Context, verification status, ticket ref…"
            className={FIELD}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="yc-primary-button inline-flex h-[38px] items-center justify-center rounded-full bg-[var(--btn)] px-[18px] text-[13px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-60"
        >
          <span>{isPending ? 'Logging...' : 'Log request'}</span>
        </button>
      </form>
      {result && !result.ok && (
        <p className="mt-2 text-[13px] text-[color:var(--danger-text)]">{result.error}</p>
      )}
      {result?.ok && (
        <p className="mt-2 text-[13px] text-[color:var(--avatar-green-ink)]">
          Request logged. The 30-day response clock has started.
        </p>
      )}
    </div>
  );
}

export function RequestsTable({
  requests,
  nowMs,
}: {
  readonly requests: DataRequest[];
  readonly nowMs: number;
}) {
  return (
    <div className="flex flex-col gap-[22px]">
      <LogForm />

      <div className={`${CARD} overflow-x-auto`}>
        {requests.length === 0 ? (
          <p className="p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
            No data-subject requests logged yet.
          </p>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] bg-[var(--screen-2)] text-left">
                <th className={TH}>Subject</th>
                <th className={TH}>Type</th>
                <th className={TH}>Received</th>
                <th className={TH}>Deadline</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const status = request.status as DataRequestStatus;
                return (
                  <tr
                    key={request.id}
                    className="border-b border-[color:var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
                  >
                    <td className="px-[18px] py-3 text-[13.5px] font-semibold text-[color:var(--ink)]">
                      {request.subjectEmail}
                    </td>
                    <td className={TD}>{TYPE_LABELS[request.type] ?? request.type}</td>
                    <td className={TD}>{request.receivedAt.toLocaleDateString()}</td>
                    <td className="px-[18px] py-3">
                      <DeadlineBadge dueAt={request.dueAt} status={status} nowMs={nowMs} />
                    </td>
                    <td className="px-[18px] py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-[18px] py-3">
                      <div className="flex justify-end">
                        <StatusControl request={request} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className={FOOTER_NOTE}>
          Open requests sort first, most overdue on top. The clock starts when the request was
          received, not when it was logged.
        </p>
      </div>
    </div>
  );
}
