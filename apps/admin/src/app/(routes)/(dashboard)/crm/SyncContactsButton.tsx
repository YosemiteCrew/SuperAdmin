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
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-xl border border-line bg-surface px-5 text-sm font-medium text-ink hover:bg-raised disabled:opacity-50"
      >
        {pending ? 'Syncing…' : 'Sync contacts to Plunk'}
      </button>
      {state.error ? <p className="text-xs text-red-500">{state.error}</p> : null}
      {state.synced === undefined ? null : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {state.synced} synced{state.failed ? `, ${state.failed} failed` : ''}
        </p>
      )}
    </form>
  );
}
