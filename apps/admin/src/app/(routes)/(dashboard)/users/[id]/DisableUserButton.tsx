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
    ? 'inline-flex h-[34px] flex-none items-center justify-center rounded-full border border-[color:var(--divider)] px-[15px] text-[12.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-60'
    : 'inline-flex h-[34px] flex-none items-center justify-center rounded-full border border-[color:var(--warn-border)] px-[15px] text-[12.5px] font-semibold text-[color:var(--warn-text)] transition-colors hover:bg-[var(--warn-bg)] disabled:opacity-60';

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
