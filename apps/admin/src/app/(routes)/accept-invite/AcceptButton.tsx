'use client';

import { useActionState } from 'react';

import { type AcceptInviteResult, acceptInviteAction } from './actions';

const INITIAL: AcceptInviteResult = {};

export function AcceptButton({ token }: { readonly token: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteResult, FormData>(
    (_prev, fd) => acceptInviteAction(fd),
    INITIAL
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p className="mb-3 text-[12.5px] text-[color:var(--danger-text)]">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="yc-primary-button inline-flex h-[42px] w-full items-center justify-center rounded-full bg-[var(--btn)] text-[13.5px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-50"
      >
        <span>{pending ? 'Accepting…' : 'Accept invitation'}</span>
      </button>
    </form>
  );
}
