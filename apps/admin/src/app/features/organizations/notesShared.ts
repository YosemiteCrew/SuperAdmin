/**
 * Client-safe org-note constants and types. Kept out of notes.ts (which is
 * `server-only` and imports SuperTokens) so client components such as
 * OrgNotes.tsx can use the character limit and the OrgNote shape without
 * dragging server-only code into the browser bundle.
 */
export const MAX_NOTES = 50;
export const MAX_NOTE_CHARS = 2000;

export interface OrgNote {
  id: string;
  actorId: string;
  actorEmail: string;
  content: string;
  at: number;
}
