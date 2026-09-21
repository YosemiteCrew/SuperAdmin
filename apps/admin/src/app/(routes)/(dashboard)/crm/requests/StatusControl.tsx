'use client';

import { type ChangeEvent, useState, useTransition } from 'react';

import { CONTACT_REQUEST_STATUS_LABELS } from '@/app/features/contact/labels';
import type { RequestStatus } from '@/app/features/contact/store';

import { updateRequestStatusAction, type UpdateStatusResult } from './actions';

// Built from the label map rather than from `REQUEST_STATUSES`: the list lives
// in `contact/store`, which is `server-only`, and a value import of it from
// this client component would pull the Prisma client into the browser bundle.
const OPTIONS: { value: RequestStatus; label: string }[] = Object.entries(
  CONTACT_REQUEST_STATUS_LABELS
).map(([value, label]) => ({ value: value as RequestStatus, label }));

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
          setSelectedStatus(result.currentStatus ?? status);
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
      {/* The status this control was loaded with - what the operator actually
          reviewed - not `selectedStatus`, which already reflects the pick
          they are submitting. The action only writes when this still matches
          the persisted row. */}
      <input type="hidden" name="expectedStatus" value={status} />
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
