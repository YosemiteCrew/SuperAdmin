'use client';

import { useActionState, useRef } from 'react';

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

export function OrgNotes({ orgId, notes }: { orgId: string; notes: OrgNote[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: NoteActionResult, fd: FormData): Promise<NoteActionResult> => {
      const result = await addNoteAction(fd);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    INITIAL
  );

  return (
    <div>
      <form ref={formRef} action={formAction} className="border-b border-line p-5">
        <input type="hidden" name="orgId" value={orgId} />
        <textarea
          name="content"
          placeholder="Add an internal note…"
          maxLength={MAX_NOTE_CHARS}
          rows={3}
          className="w-full resize-none rounded-lg border border-line bg-raised p-3 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
          required
        />
        {state.error ? <p className="mt-1 text-xs text-red-500">{state.error}</p> : null}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-btn px-4 py-1.5 text-sm font-medium text-btn-ink transition-opacity disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="p-5 text-sm text-ink-3">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {notes.map((note) => (
            <li key={note.id} className="px-5 py-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-2">{note.actorEmail}</span>
                <span className="text-xs text-ink-3">{formatNoteDate(note.at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
