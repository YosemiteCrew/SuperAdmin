import { filterAuditEvents, parseAuditActionFilter } from '@/app/features/audit/filter';
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
});
