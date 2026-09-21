'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Modal } from '@/app/ui/overlays/Modal';

const CONFIRM_WORD = 'DELETE';

export function ConfirmDeleteDialog({
  open,
  count,
  pending,
  onCancel,
  onConfirm,
}: Readonly<{
  open: boolean;
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Escape is the dialog's own `cancel` event now that Modal opens this with
  // showModal(), so there is no document-level key listener left to leak.
  useEffect(() => {
    if (!open) return;
    const timeout = globalThis.setTimeout(() => {
      setTyped('');
      inputRef.current?.focus();
    }, 0);
    return () => globalThis.clearTimeout(timeout);
  }, [open]);

  if (!open) return null;

  const noun = count === 1 ? 'user' : 'users';
  const canConfirm = typed === CONFIRM_WORD && !pending;

  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      labelledBy={titleId}
      className="fixed inset-0 m-0 grid h-full max-h-none w-full max-w-none place-items-center border-0 bg-transparent p-4 backdrop:bg-[var(--glass-93)] backdrop:backdrop-blur-[2px]"
    >
      <div className="relative w-full max-w-md rounded-[18px] border border-[color:var(--hairline)] bg-[var(--screen)] p-6 shadow-[0_2px_6px_var(--sh05),0_28px_70px_var(--sh12)]">
        <h2
          id={titleId}
          className="text-[22px] font-normal tracking-[-0.015em] text-[color:var(--ink)]"
          style={{ fontFamily: 'var(--font-serif-display)' }}
        >
          Delete {count} {noun}?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--ink-muted)]">
          This permanently removes the selected {noun} from SuperTokens core, revokes their
          sessions, and cannot be undone. Type{' '}
          <span className="font-mono font-semibold text-[color:var(--ink)]">{CONFIRM_WORD}</span> to
          confirm.
        </p>
        <input
          ref={inputRef}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          aria-label={`Type ${CONFIRM_WORD} to confirm`}
          className="mt-4 h-10 w-full rounded-xl border border-[color:var(--hairline)] bg-[var(--field-bg)] px-4 text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--danger-border)]"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[34px] items-center rounded-full border border-[color:var(--divider)] px-[15px] text-[12.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="inline-flex h-[34px] items-center rounded-full bg-[var(--danger)] px-[15px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Deleting…' : `Delete ${count} ${noun}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
