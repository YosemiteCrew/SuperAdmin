'use client';

import { useActionState, useRef } from 'react';

import { type SendCampaignResult, sendCampaignAction } from './actions';

const INITIAL: SendCampaignResult = {};

export function ComposeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: SendCampaignResult, fd: FormData): Promise<SendCampaignResult> => {
      const result = await sendCampaignAction(fd);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    INITIAL
  );

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <h2 className="text-lg font-medium text-ink">New campaign</h2>
      <p className="mt-1 mb-5 text-sm text-ink-3">
        Sent via your self-hosted Plunk instance to all matched contacts.
      </p>

      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="campaign-audience" className="mb-1.5 block text-sm font-medium text-ink">
            Audience
          </label>
          <select
            id="campaign-audience"
            name="audience"
            defaultValue="all"
            className="h-10 w-full rounded-xl border border-line bg-raised px-4 text-sm text-ink focus:border-btn focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="admins">Super-admins only</option>
          </select>
        </div>

        <div>
          <label htmlFor="campaign-subject" className="mb-1.5 block text-sm font-medium text-ink">
            Subject
          </label>
          <input
            id="campaign-subject"
            type="text"
            name="subject"
            placeholder="What's new at Yosemite Crew"
            required
            className="h-10 w-full rounded-xl border border-line bg-raised px-4 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="campaign-body" className="mb-1.5 block text-sm font-medium text-ink">
            Body
          </label>
          <textarea
            id="campaign-body"
            name="body"
            rows={8}
            placeholder="Write your message here…"
            required
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-3">
            Plain text or HTML. Plunk handles unsubscribe links.
          </p>
        </div>

        {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}

        {state.sent !== undefined ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 p-4">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Sent to {state.sent} recipient{state.sent !== 1 ? 's' : ''}
              {state.failed && state.failed > 0 ? ` (${state.failed} failed)` : ''}.
            </p>
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-xl bg-btn px-6 text-sm font-medium text-btn-fg disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
