'use client';

import { type SyntheticEvent, useState, useTransition } from 'react';

import { MAX_NOTE_CHARS, type OrgNote } from '@/app/features/organizations/notesShared';

import { type NoteActionResult, addNoteAction } from './noteActions';

function formatNoteDate(at: number): string {
  return new Date(at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const INITIAL: NoteActionResult = {};

export function OrgNotes({ orgId, notes }: { readonly orgId: string; readonly notes: OrgNote[] }) {
  const [state, setState] = useState(INITIAL);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await addNoteAction(new FormData(form));
      setState(result);
      if (!result.error) form.reset();
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="border-b border-[var(--hairline)] p-[18px]">
        <input type="hidden" name="orgId" value={orgId} />
        <textarea
          name="content"
          placeholder="Add an internal note…"
          maxLength={MAX_NOTE_CHARS}
          rows={3}
          className="w-full resize-none rounded-[11px] border-[1.5px] border-[var(--hairline)] bg-[var(--field-bg)] p-3 text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]"
          required
        />
        {state.error ? (
          <p role="alert" className="mt-1 text-[12px] text-[color:var(--danger-text)]">
            {state.error}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="yc-primary-button inline-flex h-[34px] items-center justify-center rounded-full bg-[var(--btn)] px-[14px] text-[12.5px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-50"
          >
            <span>{pending ? 'Saving…' : 'Add note'}</span>
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="p-[18px] text-[13.5px] text-[color:var(--ink-muted)]">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {notes.map((note) => (
            <li key={note.id} className="px-[18px] py-3.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[color:var(--ink-muted)]">
                  {note.actorEmail}
                </span>
                <span className="text-[12px] text-[color:var(--ink-faint)]">
                  {formatNoteDate(note.at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[13.5px] text-[color:var(--ink)]">
                {note.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
