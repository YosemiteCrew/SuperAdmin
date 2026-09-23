'use client';

import { useActionState } from 'react';

import { backfillContactsAction, type BackfillContactsResult } from './actions';

export function BackfillContactsButton() {
  const [state, formAction, pending] = useActionState<BackfillContactsResult, FormData>(
    backfillContactsAction,
    {}
  );
  const totalFailure = state.forwarded === 0 && Boolean(state.failed);
  const failedSuffix = state.failed ? `, ${state.failed} failed` : '';
  const skippedSuffix = state.skipped ? `, ${state.skipped} skipped` : '';
  const backfillResult = totalFailure
    ? `No contacts forwarded; ${state.failed} failed.`
    : `${state.forwarded} forwarded${skippedSuffix}${failedSuffix}`;

  return (
    <form action={formAction} className="flex flex-col items-end gap-[3px]">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--divider)] bg-[var(--screen)] px-5 text-[13.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
      >
        {pending ? 'Backfilling…' : 'Backfill contacts from Yosemite-Crew'}
      </button>
      {state.error ? (
        <p role="alert" className="text-[11px] font-semibold text-[color:var(--danger-text)]">
          {state.error}
        </p>
      ) : null}
      {state.forwarded === undefined ? null : (
        <p
          role={totalFailure ? 'alert' : 'status'}
          className={`text-[11px] font-semibold ${
            totalFailure
              ? 'text-[color:var(--danger-text)]'
              : 'text-[color:var(--avatar-green-ink)]'
          }`}
        >
          {backfillResult}
        </p>
      )}
    </form>
  );
}
