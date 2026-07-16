'use client';

import { useState } from 'react';

import { grantSuperAdminAction, revokeSuperAdminAction } from './actions';

export function RoleButton({
  userId,
  email,
  isAdmin,
}: Readonly<{ userId: string; email: string; isAdmin: boolean }>) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const message = isAdmin
      ? `Remove super-admin access from ${email}?\n\nThey will lose access to this panel on their next request.`
      : `Grant super-admin access to ${email}?\n\nThey will be able to manage every user and organization in this panel.`;
    if (!globalThis.confirm(message)) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  const action = isAdmin ? revokeSuperAdminAction : grantSuperAdminAction;
  const className = isAdmin
    ? 'inline-flex h-[34px] flex-none items-center justify-center rounded-full border border-[color:var(--danger-border)] px-[15px] text-[12.5px] font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)] disabled:opacity-60'
    : 'inline-flex h-[34px] flex-none items-center justify-center rounded-full bg-[var(--btn)] px-[15px] text-[12.5px] font-semibold text-[color:var(--btn-ink)] transition-opacity hover:opacity-90 disabled:opacity-60';

  function pendingLabel() {
    if (pending) return isAdmin ? 'Removing…' : 'Granting…';
    return isAdmin ? 'Remove super-admin' : 'Make super-admin';
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={className}>
        {pendingLabel()}
      </button>
    </form>
  );
}
