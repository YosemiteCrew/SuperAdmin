'use client';

import { useEffect, useId, useRef, useState } from 'react';

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

  useEffect(() => {
    if (!open) return;
    setTyped('');
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const noun = count === 1 ? 'user' : 'users';
  const canConfirm = typed === CONFIRM_WORD && !pending;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-[rgba(29,28,27,0.45)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_70px_rgba(29,28,27,0.24)]"
      >
        <h2 id={titleId} className="text-lg font-medium text-ink">
          Delete {count} {noun}?
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          This permanently removes the selected {noun} from SuperTokens core, revokes their
          sessions, and cannot be undone. Type{' '}
          <span className="font-mono font-medium text-ink">{CONFIRM_WORD}</span> to confirm.
        </p>
        <input
          ref={inputRef}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={CONFIRM_WORD}
          aria-label={`Type ${CONFIRM_WORD} to confirm`}
          className="mt-4 h-10 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-danger-600"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-raised"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="rounded-xl border border-danger-600 bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d53225] disabled:opacity-50"
          >
            {pending ? 'Deleting…' : `Delete ${count} ${noun}`}
          </button>
        </div>
      </div>
    </div>
  );
}
