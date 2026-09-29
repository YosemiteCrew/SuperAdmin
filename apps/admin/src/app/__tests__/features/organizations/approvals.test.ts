import { approvalQueue, waitingLabel } from '@/app/features/organizations/approvals';
import type { SuperAdminOrganization } from '@/app/features/organizations/types';

function org(
  id: string,
  createdAt: string,
  flags: Partial<Pick<SuperAdminOrganization, 'isVerified' | 'isActive'>> = {}
): SuperAdminOrganization {
  return {
    id,
    name: id,
    type: 'HOSPITAL',
    isVerified: false,
    isActive: true,
    memberCount: 1,
    createdAt,
    ...flags,
  };
}

describe('approvalQueue', () => {
  it('keeps only businesses waiting for verification, oldest first', () => {
    const queue = approvalQueue([
      org('newest', '2026-09-20T00:00:00.000Z'),
      org('verified', '2026-01-01T00:00:00.000Z', { isVerified: true }),
      org('suspended', '2026-01-02T00:00:00.000Z', { isActive: false }),
      org('oldest', '2026-09-01T00:00:00.000Z'),
    ]);

    expect(queue.map((o) => o.id)).toEqual(['oldest', 'newest']);
  });

  it('puts a business with an unreadable date last instead of first', () => {
    const queue = approvalQueue([
      org('unknown', 'not a date'),
      org('dated', '2026-09-01T00:00:00.000Z'),
    ]);

    expect(queue.map((o) => o.id)).toEqual(['dated', 'unknown']);
  });
});

describe('waitingLabel', () => {
  const now = Date.parse('2026-09-29T12:00:00.000Z');

  it.each([
    ['2026-09-29T08:00:00.000Z', 'Waiting since today'],
    ['2026-09-28T11:00:00.000Z', 'Waiting 1 day'],
    ['2026-09-12T12:00:00.000Z', 'Waiting 17 days'],
    ['2026-10-01T00:00:00.000Z', 'Waiting since today'],
    ['not a date', 'Waiting'],
  ])('reads %s as "%s"', (createdAt, expected) => {
    expect(waitingLabel(createdAt, now)).toBe(expected);
  });
});
