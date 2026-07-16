import {
  daysUntilDue,
  isDataRequestStatus,
  isOpenStatus,
  isOverdue,
  isRequestType,
} from '@/app/features/dataRequests/types';

describe('isRequestType', () => {
  it.each(['access', 'erasure', 'rectification', 'objection'])('accepts %s', (v) => {
    expect(isRequestType(v)).toBe(true);
  });

  it.each([['deletion'], [''], [null], [undefined], [42]])('rejects %s', (v) => {
    expect(isRequestType(v)).toBe(false);
  });
});

describe('isDataRequestStatus', () => {
  it.each(['received', 'in_progress', 'fulfilled', 'rejected'])('accepts %s', (v) => {
    expect(isDataRequestStatus(v)).toBe(true);
  });

  it.each([['closed'], ['open'], [null], [7]])('rejects %s', (v) => {
    expect(isDataRequestStatus(v)).toBe(false);
  });
});

describe('isOpenStatus', () => {
  it('is true for received and in_progress', () => {
    expect(isOpenStatus('received')).toBe(true);
    expect(isOpenStatus('in_progress')).toBe(true);
  });

  it('is false for fulfilled and rejected', () => {
    expect(isOpenStatus('fulfilled')).toBe(false);
    expect(isOpenStatus('rejected')).toBe(false);
  });
});

describe('daysUntilDue', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');

  it('returns a positive count for a future deadline', () => {
    const due = new Date('2026-07-14T12:00:00.000Z');
    expect(daysUntilDue(due, now)).toBe(10);
  });

  it('returns a negative count for a past deadline', () => {
    const due = new Date('2026-07-01T12:00:00.000Z');
    expect(daysUntilDue(due, now)).toBe(-3);
  });

  it('rounds a partial day up toward the deadline', () => {
    const due = new Date('2026-07-05T00:00:00.000Z'); // 12 hours away
    expect(daysUntilDue(due, now)).toBe(1);
  });

  // Rounding away from zero in BOTH directions. Ceil alone reports a request
  // that blew its deadline an hour ago as 0, which the table renders via
  // Math.abs as "Overdue by 0 days"; floor alone would report one due in twelve
  // hours as "Due in 0 days". Neither direction may round toward looking
  // compliant.
  it('counts a partial day already lost as a full day overdue', () => {
    const due = new Date('2026-07-04T11:00:00.000Z'); // 1 hour ago
    expect(daysUntilDue(due, now)).toBe(-1);
  });

  it('never reports an overdue request as zero days', () => {
    for (const minutesOverdue of [1, 30, 60, 60 * 23]) {
      const due = new Date(now.getTime() - minutesOverdue * 60 * 1000);
      expect(daysUntilDue(due, now)).toBeLessThan(0);
    }
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');
  const past = new Date('2026-07-01T12:00:00.000Z');
  const future = new Date('2026-07-20T12:00:00.000Z');

  it('is true only for an open request past its deadline', () => {
    expect(isOverdue(past, 'received', now)).toBe(true);
    expect(isOverdue(past, 'in_progress', now)).toBe(true);
  });

  it('is false for a closed request even if past the deadline', () => {
    expect(isOverdue(past, 'fulfilled', now)).toBe(false);
    expect(isOverdue(past, 'rejected', now)).toBe(false);
  });

  it('is false for an open request before its deadline', () => {
    expect(isOverdue(future, 'received', now)).toBe(false);
  });
});
