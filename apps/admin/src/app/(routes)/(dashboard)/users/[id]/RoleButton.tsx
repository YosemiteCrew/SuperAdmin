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
    ? 'inline-flex items-center justify-center rounded-xl border border-danger-600 px-4 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-60'
    : 'inline-flex items-center justify-center rounded-xl border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60';

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
