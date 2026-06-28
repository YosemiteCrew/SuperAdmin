import { rowsToCsv } from '@/app/lib/csv';

import { AUDIT_META } from './audit';
import type { AuditEvent } from './types';

const HEADERS = ['Timestamp', 'Action', 'Actor', 'Target type', 'Target', 'Target ID'] as const;

/** Serialises events to a CSV string with a header row (newest first). */
export function eventsToCsv(events: AuditEvent[]): string {
  return rowsToCsv(
    HEADERS,
    events.map((event) => [
      new Date(event.at).toISOString(),
      AUDIT_META[event.action]?.label ?? event.action,
      event.actorEmail,
      event.targetType,
      event.targetLabel ?? '',
      event.targetId,
    ])
  );
}
