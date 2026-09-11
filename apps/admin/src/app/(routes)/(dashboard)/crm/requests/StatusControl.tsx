'use client';

import { type ChangeEvent, useState, useTransition } from 'react';

import type { RequestStatus } from '@/app/features/contact/store';

import { updateRequestStatusAction, type UpdateStatusResult } from './actions';

const OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];

export function StatusControl({
  requestId,
  status,
}: Readonly<{ requestId: string; status: RequestStatus }>) {
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;
    const nextStatus = event.currentTarget.value as RequestStatus;
    setSelectedStatus(nextStatus);
    setError(null);

    if (!form) return;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const result: UpdateStatusResult = await updateRequestStatusAction(formData);
        if (result.error) {
          setSelectedStatus(status);
          setError(result.error);
        }
      } catch {
        setSelectedStatus(status);
        setError('Status could not be updated. Try again.');
      }
    });
  }

  return (
    <form className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="sr-only" htmlFor={`status-${requestId}`}>
        Update status
      </label>
      <select
        id={`status-${requestId}`}
        name="status"
        value={selectedStatus}
        disabled={pending}
        onChange={handleChange}
        className="h-[30px] rounded-full border border-[color:var(--hairline)] bg-[var(--field-bg)] px-3 text-[12px] font-semibold text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--blue)] disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-[11.5px] font-semibold text-[color:var(--danger-text)]">
          {error}
        </span>
      ) : null}
    </form>
  );
}
