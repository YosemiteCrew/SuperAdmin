'use server';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getDataRequest } from '@/app/features/dataRequests/store';
import { collectSubjectData } from '@/app/features/dataRequests/subjectData';

/**
 * Assembles the panel's whole record for the subject of one data request, as
 * the JSON an operator sends back to answer it.
 *
 * The request id is the input rather than the address: a server action is a
 * public POST endpoint, so taking an arbitrary email would turn this into a
 * lookup oracle over the compliance register for anyone who reached it. Going
 * through a logged request means the export can only cover a subject the
 * controller already recorded a request from.
 *
 * Handing a person's complete record to an employee is itself a sensitive act,
 * so it is audited before the payload is returned. The event points at the
 * request row, never the address — the row is what an erasure deletes, and the
 * audit log has no erasure of its own.
 */
export async function exportSubjectDataAction(formData: FormData): Promise<string | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return null;

  const request = await getDataRequest(id);
  if (!request) return null;

  const data = await collectSubjectData(request.subjectEmail);

  await recordAuditEvent({
    action: 'privacy.subject_export',
    actorId,
    targetType: 'data_request',
    targetId: request.id,
    targetLabel: request.type,
  });

  return JSON.stringify(data, null, 2);
}
