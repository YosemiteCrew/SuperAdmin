import {
  filterAuditEvents,
  paginate,
  parseAuditActionFilter,
  parseAuditDate,
  parsePage,
} from '@/app/features/audit/filter';
import type { AuditEvent } from '@/app/features/audit/types';

function event(over: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'e1',
    action: 'user.delete',
    actorId: 'admin-1',
    actorEmail: 'admin@x.com',
    targetType: 'user',
    targetId: 'u-1',
    targetLabel: 'victim@x.com',
    at: 1,
    ...over,
  };
}

const EVENTS: AuditEvent[] = [
  event({ id: 'a', action: 'user.delete', actorEmail: 'alice@x.com', targetLabel: 'bob@x.com' }),
  event({
    id: 'b',
    action: 'org.verify',
    targetType: 'organization',
    actorEmail: 'carol@x.com',
    targetLabel: 'Acme Vet',
    targetId: 'o-1',
  }),
  event({
    id: 'c',
    action: 'role.grant',
    actorEmail: 'alice@x.com',
    targetLabel: 'dave@x.com',
    targetId: 'u-9',
  }),
];

describe('parseAuditActionFilter', () => {
  it('returns a known action unchanged', () => {
    expect(parseAuditActionFilter('org.verify')).toBe('org.verify');
  });

  it('defaults to "all" for unknown or missing values', () => {
    expect(parseAuditActionFilter(undefined)).toBe('all');
    expect(parseAuditActionFilter('')).toBe('all');
    expect(parseAuditActionFilter('nonsense')).toBe('all');
  });
});

describe('filterAuditEvents', () => {
  it('returns everything when no filters are applied', () => {
    expect(filterAuditEvents(EVENTS, {})).toHaveLength(3);
  });

  it('filters by action', () => {
    expect(filterAuditEvents(EVENTS, { action: 'org.verify' }).map((e) => e.id)).toEqual(['b']);
  });

  it('searches actor and target case-insensitively', () => {
    expect(filterAuditEvents(EVENTS, { search: 'ACME' }).map((e) => e.id)).toEqual(['b']);
    expect(filterAuditEvents(EVENTS, { search: 'alice' }).map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('matches against the target id when there is no label', () => {
    const noLabel = event({ id: 'x', targetLabel: undefined, targetId: 'u-42' });
    expect(filterAuditEvents([noLabel], { search: 'u-42' }).map((e) => e.id)).toEqual(['x']);
  });

  it('combines action and search', () => {
    expect(
      filterAuditEvents(EVENTS, { action: 'role.grant', search: 'alice' }).map((e) => e.id)
    ).toEqual(['c']);
  });

  it('ignores surrounding whitespace in the search term', () => {
    expect(filterAuditEvents(EVENTS, { search: '  bob  ' }).map((e) => e.id)).toEqual(['a']);
  });

  it('filters by a date range (inclusive bounds)', () => {
    const dated = [
      event({ id: 'd1', at: 1000 }),
      event({ id: 'd2', at: 2000 }),
      event({ id: 'd3', at: 3000 }),
    ];
    expect(filterAuditEvents(dated, { from: 2000 }).map((e) => e.id)).toEqual(['d2', 'd3']);
    expect(filterAuditEvents(dated, { to: 2000 }).map((e) => e.id)).toEqual(['d1', 'd2']);
    expect(filterAuditEvents(dated, { from: 2000, to: 2000 }).map((e) => e.id)).toEqual(['d2']);
  });
});

describe('parseAuditDate', () => {
  it('returns undefined for empty or invalid input', () => {
    expect(parseAuditDate(undefined, 'start')).toBeUndefined();
    expect(parseAuditDate('', 'start')).toBeUndefined();
    expect(parseAuditDate('not-a-date', 'start')).toBeUndefined();
  });

  it('parses the start of the day', () => {
    expect(parseAuditDate('2026-01-02', 'start')).toBe(Date.parse('2026-01-02'));
  });

  it('extends the end boundary to the last millisecond of the day', () => {
    const start = Date.parse('2026-01-02');
    expect(parseAuditDate('2026-01-02', 'end')).toBe(start + 24 * 60 * 60 * 1000 - 1);
  });
});

describe('parsePage', () => {
  it('defaults to 1 for missing or invalid values', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-3')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('2.5')).toBe(1);
  });

  it('returns the parsed page for valid positive integers', () => {
    expect(parsePage('4')).toBe(4);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 12 }, (_, i) => i + 1);

  it('returns the requested slice with metadata', () => {
    const result = paginate(items, 2, 5);
    expect(result).toEqual({ items: [6, 7, 8, 9, 10], page: 2, totalPages: 3, total: 12 });
  });

  it('clamps the page above the range to the last page', () => {
    expect(paginate(items, 99, 5).page).toBe(3);
  });

  it('clamps the page below 1 to the first page', () => {
    expect(paginate(items, -2, 5).page).toBe(1);
  });

  it('reports a single page for an empty list', () => {
    expect(paginate([], 1, 5)).toEqual({ items: [], page: 1, totalPages: 1, total: 0 });
  });
});
