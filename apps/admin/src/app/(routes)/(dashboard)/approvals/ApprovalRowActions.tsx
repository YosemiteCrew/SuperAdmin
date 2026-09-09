'use client';

import { useActionState } from 'react';

import { approveAccountAction, rejectAccountAction, type ApprovalActionResult } from './actions';

const INIT: ApprovalActionResult = {};

const ROW_BTN =
  'inline-flex h-7 items-center justify-center rounded-full border px-[13px] text-[11.5px] font-semibold transition-colors disabled:opacity-60';
/** Approve reads as a positive status action, so it carries the green outline. */
const APPROVE_BTN =
  'border-[var(--avatar-green-ink)] text-[color:var(--avatar-green-ink)] hover:bg-[var(--avatar-green-bg)]';
const REJECT_BTN =
  'border-[var(--danger-border)] text-[color:var(--danger-text)] hover:bg-[var(--danger-bg)]';
const NOTE = 'text-[11.5px]';

export function ApprovalRowActions({ userId, email }: Readonly<{ userId: string; email: string }>) {
  const [approveState, approveAction, approvePending] = useActionState(
    (_prev: ApprovalActionResult, fd: FormData) => approveAccountAction(fd),
    INIT
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    (_prev: ApprovalActionResult, fd: FormData) => rejectAccountAction(fd),
    INIT
  );

  const pending = approvePending || rejectPending;
  const error = approveState.error ?? rejectState.error;
  const warning = approveState.warning ?? rejectState.warning;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={approveAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="expectedStatus" value="pending" />
          <button
            type="submit"
            disabled={pending}
            aria-label={`Approve ${email}`}
            className={`${ROW_BTN} ${APPROVE_BTN}`}
          >
            {approvePending ? 'Approving…' : 'Approve'}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="expectedStatus" value="pending" />
          <button
            type="submit"
            disabled={pending}
            aria-label={`Reject ${email}`}
            className={`${ROW_BTN} ${REJECT_BTN}`}
          >
            {rejectPending ? 'Rejecting…' : 'Reject'}
          </button>
        </form>
      </div>
      {error ? <p className={`${NOTE} text-[color:var(--danger-text)]`}>{error}</p> : null}
      {warning ? <p className={`${NOTE} text-[color:var(--warn-text)]`}>{warning}</p> : null}
      {approveState.emailSent ? (
        <p className={`${NOTE} text-[color:var(--ink-muted)]`}>Welcome email sent</p>
      ) : null}
    </div>
  );
}
