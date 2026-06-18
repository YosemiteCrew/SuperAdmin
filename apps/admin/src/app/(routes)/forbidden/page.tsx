'use client';

import { useState } from 'react';

export default function ForbiddenPage() {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch('/api/signout', { method: 'POST' });
    } catch {
      /* proceed to /auth regardless */
    }
    window.location.href = '/auth';
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="max-w-md text-sm text-ink-3">
        Your account doesn&rsquo;t have Super Admin access. If you believe this is a mistake,
        contact a platform administrator.
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="rounded-md border border-line-strong px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </main>
  );
}
