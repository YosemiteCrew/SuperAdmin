'use server';

import { revalidatePath } from 'next/cache';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { serverEnv } from '@/app/config/env.server';
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

export interface BackfillContactsResult {
  forwarded?: number;
  skipped?: number;
  failed?: number;
  error?: string;
}

function isBackfillCounts(
  value: unknown
): value is { forwarded: number; skipped: number; failed: number } {
  if (!value || typeof value !== 'object') return false;
  const counts = value as Record<string, unknown>;
  return [counts.forwarded, counts.skipped, counts.failed].every(
    (count) => Number.isSafeInteger(count) && Number(count) >= 0
  );
}

export async function backfillContactsAction(): Promise<BackfillContactsResult> {
  ensureSuperTokensInit();
  const { userId: actorId } = await requireSuperAdmin();

  const backendUrl = serverEnv.yosemiteBackendUrl;
  const backfillKey = serverEnv.yosemiteBackfillKey;

  if (!backendUrl || !backfillKey) {
    return { error: 'Yosemite-Crew backend is not configured for backfill.' };
  }

  try {
    const response = await fetch(`${backendUrl}/v1/super-admin/contact-backfill`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-backfill-key': backfillKey,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData: unknown = await response.json().catch(() => null);
      const message =
        errorData &&
        typeof errorData === 'object' &&
        'message' in errorData &&
        typeof errorData.message === 'string'
          ? errorData.message
          : `Backfill failed with status ${response.status}`;
      return { error: message };
    }

    const data: unknown = await response.json();
    if (!isBackfillCounts(data)) {
      return { error: 'Backfill returned an invalid response.' };
    }

    // Bulk import of historical contacts is a privileged action — always audited.
    await recordAuditEvent({
      action: 'crm.contact_backfill',
      actorId,
      targetType: 'system',
      targetId: 'yosemite-crew',
      targetLabel: `Yosemite-Crew (${data.forwarded} forwarded, ${data.skipped} skipped, ${data.failed} failed)`,
    });

    revalidatePath('/crm');
    return {
      forwarded: data.forwarded,
      skipped: data.skipped,
      failed: data.failed,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Backfill request failed' };
  }
}
