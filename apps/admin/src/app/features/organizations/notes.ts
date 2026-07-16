import 'server-only';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import { MAX_NOTES, type OrgNote } from './notesShared';

// Client components import these from ./notesShared directly; re-exported here so
// existing server-side call sites (page, actions, tests) resolve them unchanged.
export { MAX_NOTES, MAX_NOTE_CHARS } from './notesShared';
export type { OrgNote } from './notesShared';

const storeId = (orgId: string) => `superadmin:org-notes:${orgId}`;
const NOTES_KEY = 'notes';

function generateId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isNote(v: unknown): v is OrgNote {
  if (typeof v !== 'object' || v === null) return false;
  const n = v as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.actorId === 'string' &&
    typeof n.actorEmail === 'string' &&
    typeof n.content === 'string' &&
    typeof n.at === 'number'
  );
}

export async function getOrgNotes(orgId: string): Promise<OrgNote[]> {
  const { metadata } = await UserMetadataNode.getUserMetadata(storeId(orgId));
  const raw = metadata[NOTES_KEY];
  return Array.isArray(raw) ? raw.filter(isNote) : [];
}

export async function addOrgNote(params: {
  orgId: string;
  actorId: string;
  actorEmail: string;
  content: string;
}): Promise<void> {
  const existing = await getOrgNotes(params.orgId);
  const note: OrgNote = {
    id: generateId(),
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    content: params.content.trim(),
    at: Date.now(),
  };
  const updated = [note, ...existing].slice(0, MAX_NOTES);
  await UserMetadataNode.updateUserMetadata(storeId(params.orgId), {
    [NOTES_KEY]: updated,
  } as unknown as JSONObject);
}
