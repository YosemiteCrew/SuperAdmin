'use client';

import { useState } from 'react';

import { unverifyEmailAction, verifyEmailAction } from './actions';

export function VerifyEmailButton({
  userId,
  email,
  verified,
}: Readonly<{ userId: string; email: string; verified: boolean }>) {
  const [pending, setPending] = useState(false);

  const confirmMessage = verified
    ? `Mark ${email} as unverified?\n\nThe user's email will no longer be considered verified.`
    : `Mark ${email} as verified?\n\nThis overrides the verification check for this account.`;

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    if (!globalThis.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  function label() {
    if (pending) return 'Saving…';
    return verified ? 'Mark unverified' : 'Mark verified';
  }

  return (
    <form action={verified ? unverifyEmailAction : verifyEmailAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60"
      >
        {label()}
      </button>
    </form>
  );
}
