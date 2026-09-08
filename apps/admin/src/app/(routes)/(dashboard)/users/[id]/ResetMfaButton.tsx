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
        className="inline-flex h-[34px] flex-none items-center justify-center rounded-full border border-[color:var(--warn-border)] px-[15px] text-[12.5px] font-semibold text-[color:var(--warn-text)] transition-colors hover:bg-[var(--warn-bg)] disabled:opacity-60"
      >
        {buttonLabel()}
      </button>
    </form>
  );
}
