'use client';

import { useState } from 'react';

import { deleteUserAction } from './actions';

type Variant = 'danger-zone' | 'menu-item';

export function DeleteUserButton({
  userId,
  email,
  variant,
}: {
  userId: string;
  email: string;
  variant: Variant;
}) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
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
      ? 'inline-flex items-center justify-center rounded-xl border border-danger-600 px-4 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-60'
      : 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-neutral-100 disabled:opacity-60';

  return (
    <form action={deleteUserAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? 'Deleting…' : 'Delete user'}
      </button>
    </form>
  );
}
