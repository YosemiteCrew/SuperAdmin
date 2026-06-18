'use client';

import { useState } from 'react';

import { resetMfaAction } from './actions';

export function ResetMfaButton({
  userId,
  email,
  hasDevice,
}: Readonly<{ userId: string; email: string; hasDevice: boolean }>) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const confirmed = globalThis.confirm(
      `Reset two-factor authentication for ${email}?\n\nThis removes their authenticator device and signs them out everywhere. They will be required to set up a new TOTP device the next time they sign in.`
    );
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  function buttonLabel() {
    if (pending) return 'Resetting…';
    return hasDevice ? 'Reset 2FA device' : 'Force 2FA re-enrollment';
  }

  return (
    <form action={resetMfaAction} onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-60"
      >
        {buttonLabel()}
      </button>
    </form>
  );
}
