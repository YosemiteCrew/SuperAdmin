'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Starts an OAuth connect with a POST, then sends the browser to the provider.
 * A link would let a prefetch or a forged navigation start the flow.
 */
export function ConnectButton({
  endpoint,
  network,
}: Readonly<{ endpoint: string; network: string }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setPending(true);
    setError('');
    let message = `Could not start the ${network} connection. Try again.`;
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const payload: { authorizeUrl?: unknown; error?: unknown } = await response
        .json()
        .catch(() => ({}));
      if (response.ok && typeof payload.authorizeUrl === 'string') {
        router.push(payload.authorizeUrl);
        return;
      }
      if (typeof payload.error === 'string') message = payload.error;
    } catch {
      // Network failure: fall through to the generic message.
    }
    setError(message);
    setPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Connecting…' : `Connect ${network}`}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
