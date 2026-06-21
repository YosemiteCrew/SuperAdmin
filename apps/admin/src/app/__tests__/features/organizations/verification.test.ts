import { VERIFICATION_META, verificationState } from '@/app/features/organizations/verification';

describe('verificationState', () => {
  it('reports suspended when inactive, regardless of the verification flag', () => {
    expect(verificationState({ isVerified: true, isActive: false })).toBe('suspended');
    expect(verificationState({ isVerified: false, isActive: false })).toBe('suspended');
  });

  it('reports verified when active and verified', () => {
    expect(verificationState({ isVerified: true, isActive: true })).toBe('verified');
  });

  it('reports pending when active but not yet verified', () => {
    expect(verificationState({ isVerified: false, isActive: true })).toBe('pending');
  });
});

describe('VERIFICATION_META', () => {
  it('provides a label and badge class for every state', () => {
    expect(VERIFICATION_META.pending.label).toMatch(/pending/i);
    expect(VERIFICATION_META.verified.label).toMatch(/verified/i);
    expect(VERIFICATION_META.suspended.label).toMatch(/suspended/i);
    for (const meta of Object.values(VERIFICATION_META)) {
      expect(meta.badgeClass.length).toBeGreaterThan(0);
    }
  });
});
