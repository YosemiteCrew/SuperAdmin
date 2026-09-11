'use client';

import { useState } from 'react';

import { deleteUserAction } from './actions';

type Variant = 'danger-zone' | 'menu-item';

export function DeleteUserButton({
  userId,
  email,
  variant,
}: Readonly<{
  userId: string;
  email: string;
  variant: Variant;
}>) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const confirmed = globalThis.confirm(
      `Delete ${email}?\n\nThis removes the account from SuperTokens core, revokes all sessions, and cannot be undone.`
    );
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  const className =
    variant === 'danger-zone'
      ? 'inline-flex h-[34px] flex-none items-center justify-center rounded-full bg-[var(--danger)] px-[15px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60'
      : 'flex w-full items-center gap-[9px] rounded-[9px] px-[11px] py-[9px] text-left text-[13px] font-medium text-[color:var(--danger-text)] hover:bg-[var(--danger-bg-faint)] disabled:opacity-60';

  return (
    <form action={deleteUserAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? 'Deleting…' : 'Delete user'}
      </button>
    </form>
  );
}
