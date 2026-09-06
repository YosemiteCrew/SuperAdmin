import 'server-only';
import { prisma } from '@superadmin/database';
import UserMetadataNode from 'supertokens-node/recipe/usermetadata';

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
  await importLegacyNotes(orgId);
  const rows = await prisma.orgNote.findMany({
    where: { orgId },
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
    take: MAX_NOTES,
  });
  return rows.map(({ id, actorId, actorEmail, content, at }) => ({
    id,
    actorId,
    actorEmail,
    content,
    at: at.getTime(),
  }));
}

async function importLegacyNotes(orgId: string): Promise<void> {
  if (await prisma.orgNoteImport.findUnique({ where: { orgId }, select: { orgId: true } })) return;
  if (await prisma.orgNote.findFirst({ where: { orgId }, select: { id: true } })) {
    await prisma.orgNoteImport.upsert({ where: { orgId }, create: { orgId }, update: {} });
    return;
  }
  const { metadata } = await UserMetadataNode.getUserMetadata(storeId(orgId));
  const raw = metadata[NOTES_KEY];
  const notes = Array.isArray(raw) ? raw.filter(isNote) : [];
  if (notes.length > 0) {
    await prisma.orgNote.createMany({
      data: notes.map((note) => ({ ...note, orgId, at: new Date(note.at) })),
      skipDuplicates: true,
    });
  }
  await prisma.orgNoteImport.upsert({ where: { orgId }, create: { orgId }, update: {} });
}

export async function addOrgNote(params: {
  orgId: string;
  actorId: string;
  actorEmail: string;
  content: string;
}): Promise<void> {
  await importLegacyNotes(params.orgId);
  await prisma.orgNote.create({
    data: {
      orgId: params.orgId,
      id: generateId(),
      actorId: params.actorId,
      actorEmail: params.actorEmail,
      content: params.content.trim(),
      at: new Date(),
    },
  });
  const stale = await prisma.orgNote.findMany({
    where: { orgId: params.orgId },
    orderBy: [{ at: 'desc' }, { id: 'desc' }],
    skip: MAX_NOTES,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.orgNote.deleteMany({ where: { id: { in: stale.map(({ id }) => id) } } });
  }
}
