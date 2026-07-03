'use server';

import { revalidatePath } from 'next/cache';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { isPlunkConfigured, syncContacts } from '@/app/features/crm/plunk';
import { fetchRecipientEmails } from '@/app/features/crm/recipients';

export interface SyncContactsResult {
  synced?: number;
  failed?: number;
  error?: string;
}

export async function syncContactsAction(): Promise<SyncContactsResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  // Checked up front: syncContacts swallows per-email errors, so a missing
  // API key would otherwise masquerade as "0 synced, N failed" delivery
  // failures instead of the config problem it actually is.
  if (!isPlunkConfigured()) {
    return { error: 'Plunk is not configured on the server.' };
  }

  let emails: string[];
  try {
    emails = await fetchRecipientEmails('all');
  } catch {
    return { error: 'Failed to fetch the contact list.' };
  }
  if (emails.length === 0) return { error: 'No contacts to sync.' };

  // Contacts are created unsubscribed — consent is owned by Plunk, not this sync.
  const { synced, failed } = await syncContacts(emails);

  // Bulk export of customer emails to an external system is a privileged
  // action — always audited, even when every individual send failed.
  await recordAuditEvent({
    action: 'crm.contact_sync',
    actorId,
    targetType: 'system',
    targetId: 'plunk',
    targetLabel: `Plunk (${synced} synced, ${failed} failed)`,
  });

  revalidatePath('/crm');
  return { synced, failed };
}
