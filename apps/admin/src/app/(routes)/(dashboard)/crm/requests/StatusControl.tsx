'use client';

import { useActionState } from 'react';

import type { RequestStatus } from '@/app/features/contact/store';

import { updateRequestStatusAction, type UpdateStatusResult } from './actions';

const INIT: UpdateStatusResult = {};

const OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];

export function StatusControl({
  requestId,
  status,
}: Readonly<{ requestId: string; status: RequestStatus }>) {
  const [state, formAction, pending] = useActionState(
    (_prev: UpdateStatusResult, fd: FormData) => updateRequestStatusAction(fd),
    INIT
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="sr-only" htmlFor={`status-${requestId}`}>
        Update status
      </label>
      <select
        id={`status-${requestId}`}
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-lg border border-line bg-raised px-2 text-xs text-ink focus:border-btn focus:outline-none disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state.error ? <span className="text-xs text-red-500">{state.error}</span> : null}
    </form>
  );
}
