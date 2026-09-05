'use client';

import { useState } from 'react';
import { IoLockClosedOutline } from 'react-icons/io5';

export default function ForbiddenPage() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/signout', { method: 'POST' });
    } catch {
      /* proceed to /auth regardless */
    }
    globalThis.location.href = '/auth';
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        background:
          'radial-gradient(circle at 50% 30%, var(--auth-glow-1), transparent 50%), linear-gradient(180deg, var(--screen), var(--page))',
      }}
    >
      <span
        aria-hidden="true"
        className="flex h-[62px] w-[62px] items-center justify-center rounded-[20px] border border-[color:var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]"
      >
        <IoLockClosedOutline size={27} />
      </span>

      <h1
        className="text-[34px] font-normal tracking-[-0.02em] text-[color:var(--ink)]"
        style={{ fontFamily: 'var(--font-serif-display)' }}
      >
        Access denied
      </h1>
      <p className="max-w-md text-sm leading-[1.65] text-[color:var(--ink-muted)]">
        Your account doesn&rsquo;t have Super Admin access. If you believe this is a mistake,
        contact a platform administrator.
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-1.5 inline-flex h-[42px] items-center rounded-full border border-[color:var(--divider)] px-[22px] text-[13.5px] font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--hairline-hover)] hover:bg-[var(--inset)] disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </main>
  );
}
