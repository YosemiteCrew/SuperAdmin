'use server';

import { revalidatePath } from 'next/cache';
import SuperTokens from 'supertokens-node';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { MAX_NOTE_CHARS, addOrgNote } from '@/app/features/organizations/notes';

export interface NoteActionResult {
  error?: string;
}

export async function addNoteAction(formData: FormData): Promise<NoteActionResult> {
  const { userId: actorId } = await requireSuperAdmin();

  const orgId = formData.get('orgId');
  const content = formData.get('content');

  if (typeof orgId !== 'string' || orgId.trim().length === 0) return { error: 'Missing org' };
  if (typeof content !== 'string' || content.trim().length === 0) return { error: 'Note is empty' };
  if (content.length > MAX_NOTE_CHARS) {
    return { error: `Note too long (max ${MAX_NOTE_CHARS} characters)` };
  }

  const user = await SuperTokens.getUser(actorId);
  const actorEmail = user?.emails[0] ?? actorId;

  await addOrgNote({ orgId, actorId, actorEmail, content });
  await recordAuditEvent({
    action: 'org.note_add',
    actorId,
    targetType: 'organization',
    targetId: orgId,
  });
  revalidatePath(`/organizations/${orgId}`);
  return {};
}
