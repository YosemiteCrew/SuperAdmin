'use client';

import { useActionState } from 'react';

import { approveAccountAction, rejectAccountAction, type ApprovalActionResult } from './actions';

const INIT: ApprovalActionResult = {};

export function ApprovalRowActions({ userId, email }: { userId: string; email: string }) {
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
            className="rounded-lg border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-50"
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
            className="rounded-lg border border-danger-600 px-3 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-50"
          >
            {rejectPending ? 'Rejecting…' : 'Reject'}
          </button>
        </form>
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {warning ? <p className="text-xs text-warning-700 dark:text-warning-400">{warning}</p> : null}
      {approveState.emailSent ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Welcome email sent</p>
      ) : null}
    </div>
  );
}
