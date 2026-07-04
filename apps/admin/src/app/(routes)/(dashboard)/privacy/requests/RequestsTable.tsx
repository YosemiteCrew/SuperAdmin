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

const STATUS_STYLES: Record<DataRequestStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  fulfilled: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<DataRequestStatus, string> = {
  received: 'Received',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  rejected: 'Rejected',
};

function StatusBadge({ status }: { status: DataRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Deadline pill: red when overdue, amber when due within a week, else muted. */
function DeadlineBadge({
  dueAt,
  status,
  nowMs,
}: {
  dueAt: Date;
  status: DataRequestStatus;
  nowMs: number;
}) {
  const now = new Date(nowMs);
  if (!isOpenStatus(status)) {
    return <span className="text-xs text-gray-400">Closed</span>;
  }
  const days = daysUntilDue(dueAt, now);
  if (isOverdue(dueAt, status, now)) {
    const overdueBy = Math.abs(days);
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
        Overdue by {overdueBy} {overdueBy === 1 ? 'day' : 'days'}
      </span>
    );
  }
  const soon = days <= 7;
  const cls = soon ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      Due in {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}

function StatusControl({ request }: { request: DataRequest }) {
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
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Update'}
      </button>
      {result && !result.ok && <span className="text-xs text-red-600">{result.error}</span>}
    </form>
  );
}

function LogForm() {
  const [result, action, isPending] = useActionState<ActionResult | null, FormData>(
    async (_prev, formData) => logDataRequestAction(formData),
    null
  );
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Log a data-subject request</h2>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="dr-email" className="text-xs font-medium text-gray-700">
            Subject email
          </label>
          <input
            id="dr-email"
            name="subjectEmail"
            type="email"
            required
            placeholder="person@example.com"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dr-type" className="text-xs font-medium text-gray-700">
            Type
          </label>
          <select
            id="dr-type"
            name="type"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {REQUEST_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="dr-notes" className="text-xs font-medium text-gray-700">
            Notes (optional)
          </label>
          <input
            id="dr-notes"
            name="notes"
            placeholder="Context, verification status, ticket ref..."
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Logging...' : 'Log request'}
        </button>
      </form>
      {result && !result.ok && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
      {result?.ok && (
        <p className="mt-2 text-sm text-emerald-700">
          Request logged. The 30-day response clock has started.
        </p>
      )}
    </div>
  );
}

export function RequestsTable({ requests, nowMs }: { requests: DataRequest[]; nowMs: number }) {
  return (
    <div className="space-y-6">
      <LogForm />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {requests.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            No data-subject requests logged yet.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((request) => {
                const status = request.status as DataRequestStatus;
                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{request.subjectEmail}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {TYPE_LABELS[request.type] ?? request.type}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {request.receivedAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <DeadlineBadge dueAt={request.dueAt} status={status} nowMs={nowMs} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusControl request={request} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
