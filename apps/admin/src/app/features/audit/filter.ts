import { AUDIT_META } from './audit';
import type { AuditAction, AuditEvent } from './types';

export type AuditActionFilter = AuditAction | 'all';

const KNOWN_ACTIONS: ReadonlySet<string> = new Set(Object.keys(AUDIT_META));

/** Coerces an untrusted query-param value into a known action filter. */
export function parseAuditActionFilter(value: string | undefined): AuditActionFilter {
  return value && KNOWN_ACTIONS.has(value) ? (value as AuditAction) : 'all';
}

export interface AuditFilterOptions {
  action?: AuditActionFilter;
  search?: string;
  from?: number;
  to?: number;
}

/** Filters events by action, a case-insensitive actor/target search, and a date range. */
export function filterAuditEvents(events: AuditEvent[], options: AuditFilterOptions): AuditEvent[] {
  const action = options.action ?? 'all';
  const search = (options.search ?? '').trim().toLowerCase();
  return events.filter((event) => {
    if (action !== 'all' && event.action !== action) return false;
    if (typeof options.from === 'number' && event.at < options.from) return false;
    if (typeof options.to === 'number' && event.at > options.to) return false;
    if (search) {
      const haystack =
        `${event.actorEmail} ${event.targetLabel ?? ''} ${event.targetId}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parses a `YYYY-MM-DD` query value into an epoch-ms bound. `end` extends to the
 * last millisecond of that day so the range is inclusive. Returns undefined for
 * empty/invalid input.
 */
export function parseAuditDate(
  value: string | undefined,
  boundary: 'start' | 'end'
): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return undefined;
  return boundary === 'end' ? ms + MS_PER_DAY - 1 : ms;
}

export const AUDIT_PAGE_SIZE = 25;

/** Coerces an untrusted page query value into a positive integer (defaults to 1). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

/** Clamps `page` into range and returns that slice plus paging metadata. */
export function paginate<T>(items: T[], page: number, pageSize = AUDIT_PAGE_SIZE): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, totalPages, total };
}
