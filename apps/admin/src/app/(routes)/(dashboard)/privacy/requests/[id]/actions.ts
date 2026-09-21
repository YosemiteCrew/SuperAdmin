'use server';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent, tryRecordAuditEvent } from '@/app/features/audit/store';
import { getDataRequest } from '@/app/features/dataRequests/store';
import { collectSubjectData } from '@/app/features/dataRequests/subjectData';
import {
  eraseSubjectData,
  type SubjectErasureReport,
} from '@/app/features/dataRequests/subjectErasure';

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
 * so an audit event is written before the payload is returned. That is ordering
 * and not enforcement: `recordAuditEvent` logs its own failures and resolves, so
 * a disclosure still happens if the audit write does not. Repo-wide that is the
 * right trade — a privileged action should not be blocked by its own logging —
 * and this is the call site where it is weakest, which is #310.
 *
 * The event points at the request row, never the address: the row is what an
 * erasure keeps, and the audit log has no erasure of its own.
 */
export interface SubjectDataExportResult {
  json: string;
  auditRecorded: boolean;
}

export async function exportSubjectDataAction(
  formData: FormData
): Promise<SubjectDataExportResult | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return null;

  const request = await getDataRequest(id);
  if (!request) return null;

  const data = await collectSubjectData(request.subjectEmail);

  const auditRecorded = await tryRecordAuditEvent({
    action: 'privacy.subject_export',
    actorId,
    targetType: 'data_request',
    targetId: request.id,
    targetLabel: request.type,
  });

  return { json: JSON.stringify(data, null, 2), auditRecorded };
}

/**
 * Carries out the erasure the request asks for, and reports what it did.
 *
 * Same trust boundary as the export above — the id is the input, the address
 * comes off the stored row — with one guard the export does not need: the
 * request's own `type` must be `erasure`. This is irreversible, so it may only
 * run for a request that actually asked for it, and a mis-posted id belonging
 * to an `access` request refuses rather than deletes.
 *
 * A durable authorization event is required before deletion. The completed
 * erasure is then recorded separately, so a failed delete is never described
 * as completed and an audit outage cannot permit an unrecorded deletion.
 */
export async function eraseSubjectDataAction(
  formData: FormData
): Promise<SubjectErasureReport | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return null;

  const request = await getDataRequest(id);
  if (!request || request.type !== 'erasure') return null;

  const authorized = await tryRecordAuditEvent({
    action: 'privacy.subject_erase_authorize',
    actorId,
    targetType: 'data_request',
    targetId: request.id,
    targetLabel: request.type,
  });
  if (!authorized) return null;

  const report = await eraseSubjectData(request.subjectEmail);

  await recordAuditEvent({
    action: 'privacy.subject_erase',
    actorId,
    targetType: 'data_request',
    targetId: request.id,
    targetLabel: request.type,
  });

  return report;
}
