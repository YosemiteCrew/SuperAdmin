'use client';

import { useActionState } from 'react';

import { type AcceptInviteResult, acceptInviteAction } from './actions';

const INITIAL: AcceptInviteResult = {};

export function AcceptButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteResult, FormData>(
    (_prev, fd) => acceptInviteAction(fd),
    INITIAL
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {state.error ? <p className="mb-3 text-sm text-red-500">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-btn py-3 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Accepting…' : 'Accept invitation'}
      </button>
    </form>
  );
}
