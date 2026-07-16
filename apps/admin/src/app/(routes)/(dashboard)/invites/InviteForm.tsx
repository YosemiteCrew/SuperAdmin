'use client';

import { useActionState, useRef } from 'react';

import { type CreateInviteResult, createInviteAction } from './actions';

const INITIAL: CreateInviteResult = {};

const CARD =
  'rounded-[18px] border bg-[var(--screen)] px-[22px] py-[18px] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';

/**
 * The ready panel is the one card that does not take the neutral hairline: a
 * generated link is a good status, so it earns the green border and title.
 */
function InviteReadyCard({
  inviteUrl,
  onCopy,
}: Readonly<{ inviteUrl: string; onCopy: () => void }>) {
  return (
    <div className={`${CARD} flex flex-col gap-3 border-[var(--avatar-green-ink)]/30`}>
      <h3 className="text-[13px] font-bold text-[color:var(--avatar-green-ink)]">
        Invite link ready
      </h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-[10px] border border-[var(--hairline)] bg-[var(--field-bg)] px-3 py-2 font-mono text-[11.5px] text-[color:var(--ink)]">
          {inviteUrl}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-[34px] flex-none items-center justify-center rounded-full border border-[var(--divider)] px-[14px] text-[12.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
        >
          Copy
        </button>
      </div>
      {/* 24 hours is INVITE_TTL_MS, not a guess; the result carries no expiry. */}
      <p className="text-[11.5px] text-[color:var(--ink-faint)]">
        Expires in 24 hours · accepting grants the superadmin role to the signed-in account
      </p>
    </div>
  );
}

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
      <div className={`${CARD} flex flex-col gap-3 border-[var(--hairline)]`}>
        <div className="flex flex-col gap-1">
          <h2 className="text-[15.5px] font-bold text-[color:var(--ink)]">Generate invite link</h2>
          <p className="text-[12.5px] text-[color:var(--ink-faint)]">
            The link expires in 24 hours. The recipient must be signed in to accept it.
          </p>
        </div>

        <form ref={formRef} action={formAction} className="flex flex-col gap-3">
          <div className="flex items-end gap-[10px]">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                htmlFor="invite-email"
                className="text-[12px] font-semibold text-[color:var(--ink-soft)]"
              >
                Recipient email
              </label>
              <input
                id="invite-email"
                type="email"
                name="email"
                placeholder="newadmin@example.com"
                required
                className="h-10 w-full rounded-xl border-[1.5px] border-[var(--hairline)] bg-[var(--field-bg)] px-4 text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="yc-primary-button inline-flex h-10 flex-none items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[13.5px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-60"
            >
              <span>{pending ? 'Generating…' : 'Generate link'}</span>
            </button>
          </div>

          {state.error ? (
            <p className="text-[13px] font-semibold text-[color:var(--danger-text)]">
              {state.error}
            </p>
          ) : null}
        </form>
      </div>

      {state.inviteUrl ? <InviteReadyCard inviteUrl={state.inviteUrl} onCopy={copyLink} /> : null}
    </div>
  );
}
