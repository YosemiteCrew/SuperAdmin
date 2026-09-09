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
        className="h-[30px] rounded-full border border-[color:var(--hairline)] bg-[var(--field-bg)] px-3 text-[12px] font-semibold text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--blue)] disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state.error ? (
        <span className="text-[11.5px] font-semibold text-[color:var(--danger-text)]">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
