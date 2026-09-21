'use server';

import { requireSuperAdmin } from '@/app/config/backend';
import { eventsToCsv } from '@/app/features/audit/csv';
import { parseAuditActionFilter, parseAuditDate } from '@/app/features/audit/filter';
import { getFilteredAuditEvents } from '@/app/features/audit/store';

export interface AuditExportFilters {
  action?: string;
  search?: string;
  from?: string;
  to?: string;
}

export async function exportAuditAction(filters: AuditExportFilters): Promise<string> {
  await requireSuperAdmin();
  const events = await getFilteredAuditEvents({
    action: parseAuditActionFilter(filters.action),
    search: (filters.search ?? '').trim(),
    from: parseAuditDate(filters.from?.trim(), 'start'),
    to: parseAuditDate(filters.to?.trim(), 'end'),
  });
  return eventsToCsv(events);
}
