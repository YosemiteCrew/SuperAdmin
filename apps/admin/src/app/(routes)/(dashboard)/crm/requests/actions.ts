'use server';

import { revalidatePath } from 'next/cache';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { isRequestStatus, setRequestStatus } from '@/app/features/contact/store';

export interface UpdateStatusResult {
  error?: string;
  status?: string;
}

export async function updateRequestStatusAction(formData: FormData): Promise<UpdateStatusResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const requestId = formData.get('requestId');
  const status = formData.get('status');

  if (typeof requestId !== 'string' || requestId.length === 0) {
    return { error: 'Invalid request id.' };
  }
  if (!isRequestStatus(status)) {
    return { error: 'Invalid status.' };
  }

  await setRequestStatus({ requestId, status, actorId });
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
