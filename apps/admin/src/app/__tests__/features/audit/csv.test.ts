import { eventsToCsv } from '@/app/features/audit/csv';
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
    at: Date.UTC(2026, 0, 2, 3, 4, 5),
    ...over,
  };
}

describe('eventsToCsv', () => {
  it('emits a header row even with no events', () => {
    const csv = eventsToCsv([]);
    expect(csv).toBe('Timestamp,Action,Actor,Target type,Target,Target ID');
  });

  it('emits one row per event with the resolved action label', () => {
    const csv = eventsToCsv([event()]);
    const [header, row] = csv.split('\n');
    expect(header.startsWith('Timestamp,Action')).toBe(true);
    expect(row).toContain('2026-01-02T03:04:05.000Z');
    expect(row).toContain('Deleted user');
    expect(row).toContain('admin@x.com');
    expect(row).toContain('victim@x.com');
    expect(row).toContain('u-1');
  });

  it('quotes and escapes fields containing commas or quotes', () => {
    const csv = eventsToCsv([
      event({ targetType: 'organization', targetLabel: 'Acme, "Pets" Inc', targetId: 'o-1' }),
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain('"Acme, ""Pets"" Inc"');
  });

  it('falls back to the raw action when it is unknown', () => {
    const csv = eventsToCsv([event({ action: 'mystery.event' as AuditEvent['action'] })]);
    expect(csv.split('\n')[1]).toContain('mystery.event');
  });

  it('renders an empty target cell when there is no label', () => {
    const csv = eventsToCsv([event({ targetLabel: undefined, targetId: 'u-7' })]);
    const row = csv.split('\n')[1];
    // ...Actor,user,,u-7  — the empty Target field sits between two commas.
    expect(row).toContain(',user,,u-7');
  });
});
