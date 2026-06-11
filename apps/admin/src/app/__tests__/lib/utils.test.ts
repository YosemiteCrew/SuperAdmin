import { formatDate } from '@/app/lib/utils';

describe('formatDate', () => {
  it('formats a Date in en-US short month form', () => {
    const date = new Date('2026-06-09T18:00:00Z');
    const out = formatDate(date);
    expect(out).toMatch(/Jun\s+\d{1,2},\s+2026/);
  });

  it('round-trips for the start of a year', () => {
    const date = new Date('2030-01-01T00:00:00Z');
    expect(formatDate(date)).toContain('2030');
    expect(formatDate(date)).toMatch(/Jan/);
  });
});
