'use client';

import { useState, useTransition } from 'react';

import { disconnectTikTokAction } from './actions';

export function DisconnectButton({ accountLabel }: Readonly<{ accountLabel: string }>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleClick() {
    const confirmed = globalThis.confirm(
      `Disconnect ${accountLabel}?\n\nScheduled and manual posting will stop until an admin reconnects. The stored credentials are deleted.`
    );
    if (!confirmed) return;
    setError('');
    startTransition(async () => {
      const result = await disconnectTikTokAction();
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border border-danger-600 px-4 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-60"
      >
        {pending ? 'Disconnecting…' : 'Disconnect'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
