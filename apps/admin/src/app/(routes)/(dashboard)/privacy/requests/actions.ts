'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { createDataRequest, updateDataRequestStatus } from '@/app/features/dataRequests/store';
import {
  isDataRequestStatus,
  isRequestType,
  REQUEST_TYPES,
} from '@/app/features/dataRequests/types';
import { isValidEmail } from '@/app/features/settings/email';

const REQUESTS_PATH = '/privacy/requests';

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Logs a new data-subject request received by email/support and starts the
 * statutory response clock. Audited as privacy.request_create.
 */
export async function logDataRequestAction(formData: FormData): Promise<ActionResult> {
  const { userId: callerId } = await requireSuperAdmin();

  const subjectEmail = formData.get('subjectEmail');
  const type = formData.get('type');
  const notesRaw = formData.get('notes');

  if (typeof subjectEmail !== 'string' || !isValidEmail(subjectEmail)) {
    return { ok: false, error: 'A valid subject email is required' };
  }
  if (!isRequestType(type)) {
    return { ok: false, error: `type must be one of: ${REQUEST_TYPES.join(', ')}` };
  }
  const notes = typeof notesRaw === 'string' ? notesRaw : undefined;

  const request = await createDataRequest({
    subjectEmail: subjectEmail.trim(),
    type,
    notes,
  });

  // The subject's email is deliberately NOT recorded here. It lives on the
  // DataRequest row this event points at (targetId), which is erasable; copying
  // it into the audit log would mean honouring an erasure request still left the
  // requester's address behind, in a log with no erasure workflow of its own.
  // The type is what the trail needs: who logged what kind of request, when.
  await recordAuditEvent({
    action: 'privacy.request_create',
    actorId: callerId,
    targetType: 'data_request',
    targetId: request.id,
    targetLabel: type,
  });

  revalidatePath(REQUESTS_PATH);
  return { ok: true };
}

/**
 * Moves a request to a new status (in_progress / fulfilled / rejected).
 * Audited as privacy.request_update.
 *
 * `expectedStatus` is the status the operator's page showed them, submitted
 * alongside the chosen one. The store only writes when that still matches the
 * persisted row, so a stale page can never overwrite a decision made after it
 * loaded - it gets a clear message and the refreshed row instead.
 */
export async function updateDataRequestStatusAction(formData: FormData): Promise<ActionResult> {
  const { userId: callerId } = await requireSuperAdmin();

  const id = formData.get('id');
  const status = formData.get('status');
  const expectedStatus = formData.get('expectedStatus');

  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: 'A request id is required' };
  }
  if (!isDataRequestStatus(status) || !isDataRequestStatus(expectedStatus)) {
    return { ok: false, error: 'Unknown status' };
  }

  const result = await updateDataRequestStatus({ id, status, expectedStatus, handledBy: callerId });
  if (!result.ok) {
    revalidatePath(REQUESTS_PATH);
    return {
      ok: false,
      error:
        'Someone else already updated this request. Its current status is shown below - review it and try again.',
    };
  }

  // Status only, for the same reason as the create path above: the row behind
  // targetId carries the subject, and it is the thing erasure deletes.
  await recordAuditEvent({
    action: 'privacy.request_update',
    actorId: callerId,
    targetType: 'data_request',
    targetId: id,
    targetLabel: status,
  });

  revalidatePath(REQUESTS_PATH);
  return { ok: true };
}
