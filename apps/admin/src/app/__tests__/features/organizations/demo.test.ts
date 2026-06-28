import { DEMO_ORGANIZATIONS, getDemoOrganization } from '@/app/features/organizations/demo';

describe('demo organizations', () => {
  it('exposes a non-empty demo list', () => {
    expect(DEMO_ORGANIZATIONS.length).toBeGreaterThan(0);
  });

  it('returns the detail record for a known id', () => {
    expect(getDemoOrganization('demo-1')?.name).toMatch(/Example Domain/);
  });

  it('returns null for an unknown id', () => {
    expect(getDemoOrganization('nope')).toBeNull();
  });
});
