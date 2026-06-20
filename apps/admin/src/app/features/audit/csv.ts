import { AUDIT_META } from './audit';
import type { AuditEvent } from './types';

const HEADERS = ['Timestamp', 'Action', 'Actor', 'Target type', 'Target', 'Target ID'] as const;

/** Quotes a CSV field when it contains a comma, quote, or newline. */
function escapeCsv(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Serialises events to a CSV string with a header row (newest first). */
export function eventsToCsv(events: AuditEvent[]): string {
  const rows = events.map((event) =>
    [
      new Date(event.at).toISOString(),
      AUDIT_META[event.action]?.label ?? event.action,
      event.actorEmail,
      event.targetType,
      event.targetLabel ?? '',
      event.targetId,
    ]
      .map((field) => escapeCsv(String(field)))
      .join(',')
  );
  return [HEADERS.join(','), ...rows].join('\n');
}
