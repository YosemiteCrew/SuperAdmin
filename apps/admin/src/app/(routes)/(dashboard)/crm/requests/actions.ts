'use server';

import { revalidatePath } from 'next/cache';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import {
  isRequestStatus,
  setRequestStatus,
  type RequestStatus,
} from '@/app/features/contact/store';

export interface UpdateStatusResult {
  error?: string;
  status?: string;
  /** Set alongside a stale-write error so the UI can reset to the real value. */
  currentStatus?: RequestStatus;
}

/**
 * `expectedStatus` is the status the operator's page showed before they
 * picked a new one. `setRequestStatus` only writes when that still matches
 * the persisted row, so a page left open while another admin actions the same
 * request cannot silently overwrite that decision.
 */
export async function updateRequestStatusAction(formData: FormData): Promise<UpdateStatusResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const requestId = formData.get('requestId');
  const status = formData.get('status');
  const expectedStatus = formData.get('expectedStatus');

  if (typeof requestId !== 'string' || requestId.length === 0) {
    return { error: 'Invalid request id.' };
  }
  if (!isRequestStatus(status) || !isRequestStatus(expectedStatus)) {
    return { error: 'Invalid status.' };
  }

  const result = await setRequestStatus({ requestId, status, expectedStatus, actorId });
  if (!result.ok) {
    revalidatePath('/crm/requests');
    return {
      error:
        'Someone else already updated this request. Its current status is shown below - review it and try again.',
      currentStatus: result.currentStatus ?? undefined,
    };
  }

  await recordAuditEvent({
    action: 'contact.status_change',
    actorId,
    targetType: 'contact_request',
    targetId: requestId,
    targetLabel: status,
  });

  revalidatePath('/crm/requests');
  return { status };
}
