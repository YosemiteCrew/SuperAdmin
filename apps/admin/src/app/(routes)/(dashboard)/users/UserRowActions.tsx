'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IoOpenOutline, IoTrashOutline } from 'react-icons/io5';

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
        className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[color:var(--hairline)] text-[color:var(--ink-faint)] transition-colors hover:bg-[var(--inset)] hover:text-[color:var(--ink)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[190px] overflow-hidden rounded-[14px] border border-[color:var(--hairline)] bg-[var(--screen)] p-[6px] shadow-[0_4px_10px_var(--sh06),0_22px_50px_var(--sh12)]"
        >
          <Link
            href={`/users/${userId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-[9px] rounded-[9px] px-[11px] py-[9px] text-left text-[13px] font-medium text-[color:var(--ink)] hover:bg-[var(--surface-soft)]"
          >
            <IoOpenOutline
              aria-hidden="true"
              className="text-[14px] text-[color:var(--ink-faint)]"
            />
            View details
          </Link>
          <form action={deleteUserAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-[9px] rounded-[9px] px-[11px] py-[9px] text-left text-[13px] font-medium text-[color:var(--danger-text)] hover:bg-[var(--danger-bg-faint)] disabled:opacity-60"
            >
              <IoTrashOutline aria-hidden="true" className="text-[14px]" />
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
