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

const REQUESTS_PATH = '/privacy/requests';

/**
 * Structural email sanity check: exactly one `@` (not at either end) and a dot
 * inside the domain (not at either end), with no whitespace. Done with string
 * ops rather than a regex to avoid catastrophic backtracking (S5852) — this is
 * an intake guard against obvious garbage, not RFC 5322 validation.
 */
function isEmailish(value: string): boolean {
  if (/\s/.test(value)) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@') || at === value.length - 1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

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

  if (typeof subjectEmail !== 'string' || !isEmailish(subjectEmail.trim())) {
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
 */
export async function updateDataRequestStatusAction(formData: FormData): Promise<ActionResult> {
  const { userId: callerId } = await requireSuperAdmin();

  const id = formData.get('id');
  const status = formData.get('status');

  if (typeof id !== 'string' || id.length === 0) {
    return { ok: false, error: 'A request id is required' };
  }
  if (!isDataRequestStatus(status)) {
    return { ok: false, error: 'Unknown status' };
  }

  await updateDataRequestStatus({ id, status, handledBy: callerId });

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
