'use client';

import { useActionState, useRef } from 'react';

import { type CreateInviteResult, createInviteAction } from './actions';

const INITIAL: CreateInviteResult = {};

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: CreateInviteResult, fd: FormData): Promise<CreateInviteResult> => {
      const result = await createInviteAction(fd);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    INITIAL
  );

  async function copyLink() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <h2 className="text-lg font-medium text-ink">Generate invite link</h2>
      <p className="mt-1 mb-5 text-sm text-ink-3">
        The link expires in 24 hours. The recipient must be signed in to accept it.
      </p>

      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-ink">
            Recipient email
          </label>
          <input
            id="invite-email"
            type="email"
            name="email"
            placeholder="newadmin@example.com"
            required
            className="h-10 w-full rounded-xl border border-line bg-raised px-4 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
          />
        </div>

        {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-btn px-5 text-sm font-medium text-btn-ink disabled:opacity-50"
          >
            {pending ? 'Generating…' : 'Generate link'}
          </button>
        </div>
      </form>

      {state.inviteUrl ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4">
          <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Invite link ready
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink">
              {state.inviteUrl}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="h-9 shrink-0 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-raised"
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
