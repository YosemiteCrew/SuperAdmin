'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { deleteUserAction } from './actions';

export function UserRowActions({ userId, email }: Readonly<{ userId: string; email: string }>) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleDeleteSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    const confirmed = globalThis.confirm(
      `Delete ${email}?\n\nThis removes the account from SuperTokens core, revokes all sessions, and cannot be undone.`
    );
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    setPending(true);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${email}`}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:bg-raised hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-44 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_22px_rgba(29,28,27,0.12)]"
        >
          <Link
            href={`/users/${userId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-raised"
          >
            View details
          </Link>
          <form action={deleteUserAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-danger-600 hover:bg-raised disabled:opacity-60"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
