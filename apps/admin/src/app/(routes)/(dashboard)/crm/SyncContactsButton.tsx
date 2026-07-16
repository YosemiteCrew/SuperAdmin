'use client';

import { useActionState } from 'react';

import { syncContactsAction, type SyncContactsResult } from './actions';

export function SyncContactsButton() {
  // The initial state is built here rather than held in a module-level constant:
  // module scope outlives every render, so a shared object would be one mutation
  // away from leaking state between renders. useActionState only reads it on the
  // first render, so allocating per render costs nothing.
  const [state, formAction, pending] = useActionState<SyncContactsResult, FormData>(
    syncContactsAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-[3px]">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--divider)] bg-[var(--screen)] px-5 text-[13.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50"
      >
        {pending ? 'Syncing…' : 'Sync contacts to Plunk'}
      </button>
      {state.error ? (
        <p className="text-[11px] font-semibold text-[color:var(--danger-text)]">{state.error}</p>
      ) : null}
      {state.synced === undefined ? null : (
        <p className="text-[11px] font-semibold text-[color:var(--success)]">
          {state.synced} synced{state.failed ? `, ${state.failed} failed` : ''}
        </p>
      )}
    </form>
  );
}
