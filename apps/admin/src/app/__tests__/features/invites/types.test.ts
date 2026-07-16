import { inviteStatus, type InviteRecord } from '@/app/features/invites/types';

function makeInvite(overrides: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: 'i1',
    token: 'tok1',
    email: 'a@b.com',
    createdBy: 'u1',
    createdByEmail: 'a@b.com',
    createdAt: Date.now() - 1000,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

describe('inviteStatus', () => {
  it('returns pending for a fresh invite', () => {
    expect(inviteStatus(makeInvite())).toBe('pending');
  });

  it('returns revoked when revokedAt is set', () => {
    expect(inviteStatus(makeInvite({ revokedAt: Date.now() }))).toBe('revoked');
  });

  it('returns used when usedAt is set', () => {
    expect(inviteStatus(makeInvite({ usedAt: Date.now() }))).toBe('used');
  });

  it('returns expired when expiresAt is in the past', () => {
    expect(inviteStatus(makeInvite({ expiresAt: Date.now() - 1 }))).toBe('expired');
  });

  it('prefers revoked over used', () => {
    expect(inviteStatus(makeInvite({ revokedAt: Date.now(), usedAt: Date.now() }))).toBe('revoked');
  });
});
