'use client';

import { useActionState } from 'react';

import { syncContactsAction, type SyncContactsResult } from './actions';

const INIT: SyncContactsResult = {};

export function SyncContactsButton() {
  const [state, formAction, pending] = useActionState<SyncContactsResult, FormData>(
    () => syncContactsAction(),
    INIT
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
