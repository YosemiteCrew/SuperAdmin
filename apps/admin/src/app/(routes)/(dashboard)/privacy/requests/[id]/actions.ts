'use server';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEventStrict } from '@/app/features/audit/store';
import { getDataRequest } from '@/app/features/dataRequests/store';
import { collectSubjectData } from '@/app/features/dataRequests/subjectData';
import {
  eraseSubjectData,
  type SubjectErasureReport,
} from '@/app/features/dataRequests/subjectErasure';
import { logger } from '@/app/lib/logger';

/** The dossier plus whether the audit write that should accompany it landed. */
export interface SubjectExportResult {
  json: string;
  auditFailed: boolean;
}

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
 * so an audit event is written before the payload is returned. Decided on
 * #310: a disclosure inside a statutory deadline should not be blocked by its
 * own logging, so the export still proceeds if the write fails — but unlike
 * every other call site, this one cannot just swallow that failure, because an
 * unrecorded disclosure is invisible otherwise. `auditFailed` carries that to
 * the caller so the operator answering the request is told their own paper
 * trail has a hole in it. It is never mixed into `json` itself — that string is
 * the payload sent to the data subject, not a place for internal audit state.
 *
 * The event points at the request row, never the address: the row is what an
 * erasure keeps, and the audit log has no erasure of its own.
 */
export async function exportSubjectDataAction(
  formData: FormData
): Promise<SubjectExportResult | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return null;

  const request = await getDataRequest(id);
  if (!request) return null;

  const data = await collectSubjectData(request.subjectEmail);

  let auditFailed = false;
  try {
    await recordAuditEventStrict({
      action: 'privacy.subject_export',
      actorId,
      targetType: 'data_request',
      targetId: request.id,
      targetLabel: request.type,
    });
  } catch (error) {
    auditFailed = true;
    logger.error('Audit write failed for a subject export; disclosure proceeded unrecorded', {
      requestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { json: JSON.stringify(data, null, 2), auditFailed };
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
 * Decided on #310, and the opposite trade from the export: this action is
 * unrecoverable, so it fails closed. The audit event is written and confirmed
 * *before* the delete runs, not after; if that write fails, nothing is erased.
 * The cost is that the log now records an erasure that was about to be
 * attempted rather than one that definitely completed, which is the better of
 * the two failure shapes — a stray audit line pointing at nothing beats a
 * destroyed record with no line pointing at it at all.
 */
export async function eraseSubjectDataAction(
  formData: FormData
): Promise<SubjectErasureReport | null> {
  const { userId: actorId } = await requireSuperAdmin();

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return null;

  const request = await getDataRequest(id);
  if (!request || request.type !== 'erasure') return null;

  try {
    await recordAuditEventStrict({
      action: 'privacy.subject_erase',
      actorId,
      targetType: 'data_request',
      targetId: request.id,
      targetLabel: request.type,
    });
  } catch (error) {
    logger.error('Audit write failed for a subject erasure; refusing to erase', {
      requestId: request.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return eraseSubjectData(request.subjectEmail);
}
