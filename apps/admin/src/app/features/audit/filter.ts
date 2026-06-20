import { AUDIT_META } from './audit';
import type { AuditAction, AuditEvent } from './types';

export type AuditActionFilter = AuditAction | 'all';

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(Object.keys(AUDIT_META));

/** Coerces an untrusted query-param value into a known action filter. */
export function parseAuditActionFilter(value: string | undefined): AuditActionFilter {
  return value && KNOWN_ACTIONS.has(value) ? (value as AuditAction) : 'all';
}

/** Filters events by action and a case-insensitive actor/target search. */
export function filterAuditEvents(
  events: AuditEvent[],
  options: { action?: AuditActionFilter; search?: string }
): AuditEvent[] {
  const action = options.action ?? 'all';
  const search = (options.search ?? '').trim().toLowerCase();
  return events.filter((event) => {
    if (action !== 'all' && event.action !== action) return false;
    if (search) {
      const haystack =
        `${event.actorEmail} ${event.targetLabel ?? ''} ${event.targetId}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
