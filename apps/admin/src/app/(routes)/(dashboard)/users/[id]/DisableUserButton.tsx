'use client';

import { useState } from 'react';

import { disableUserAction, enableUserAction } from './actions';

export function DisableUserButton({
  userId,
  email,
  disabled,
}: Readonly<{ userId: string; email: string; disabled: boolean }>) {
  const [pending, setPending] = useState(false);

  const confirmMessage = disabled
    ? `Re-enable ${email}?\n\nThey will be able to sign in again.`
    : `Disable ${email}?\n\nThey will be signed out everywhere and blocked from signing in until re-enabled. Their data is preserved.`;

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    if (!globalThis.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  const className = disabled
    ? 'inline-flex items-center justify-center rounded-xl border border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60'
    : 'inline-flex items-center justify-center rounded-xl border border-warning-600 px-4 py-2.5 text-sm font-medium text-warning-800 transition-colors hover:bg-warning-100 disabled:opacity-60';

  function label() {
    if (pending) return disabled ? 'Enabling…' : 'Disabling…';
    return disabled ? 'Enable account' : 'Disable account';
  }

  return (
    <form action={disabled ? enableUserAction : disableUserAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={className}>
        {label()}
      </button>
    </form>
  );
}
