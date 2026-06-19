import {
  filterOrganizations,
  organizationCounts,
  parseOrgFilter,
} from '@/app/features/organizations/filter';
import type { SuperAdminOrganization } from '@/app/features/organizations/types';

function org(over: Partial<SuperAdminOrganization>): SuperAdminOrganization {
  return {
    id: 'o',
    name: 'Biz',
    type: 'HOSPITAL',
    isVerified: false,
    isActive: true,
    memberCount: 1,
    createdAt: '2026-01-01',
    ...over,
  };
}

const ORGS: SuperAdminOrganization[] = [
  org({ id: 'p1', name: 'Acme Vet', isVerified: false, isActive: true }), // pending
  org({ id: 'v1', name: 'Bright Paws', isVerified: true, isActive: true }), // verified
  org({ id: 's1', name: 'Acme Grooming', isVerified: true, isActive: false }), // suspended
];

describe('parseOrgFilter', () => {
  it('accepts known filters', () => {
    expect(parseOrgFilter('pending')).toBe('pending');
    expect(parseOrgFilter('verified')).toBe('verified');
    expect(parseOrgFilter('suspended')).toBe('suspended');
    expect(parseOrgFilter('all')).toBe('all');
  });

  it('falls back to all for unknown or missing values', () => {
    expect(parseOrgFilter('bogus')).toBe('all');
    expect(parseOrgFilter(undefined)).toBe('all');
  });
});

describe('filterOrganizations', () => {
  it('returns everything for the all filter and no search', () => {
    expect(filterOrganizations(ORGS, { state: 'all' })).toHaveLength(3);
  });

  it('filters by verification state', () => {
    expect(filterOrganizations(ORGS, { state: 'pending' }).map((o) => o.id)).toEqual(['p1']);
    expect(filterOrganizations(ORGS, { state: 'verified' }).map((o) => o.id)).toEqual(['v1']);
    expect(filterOrganizations(ORGS, { state: 'suspended' }).map((o) => o.id)).toEqual(['s1']);
  });

  it('filters by case-insensitive name search', () => {
    expect(filterOrganizations(ORGS, { search: 'acme' }).map((o) => o.id)).toEqual(['p1', 's1']);
  });

  it('combines state and search', () => {
    expect(
      filterOrganizations(ORGS, { state: 'suspended', search: 'acme' }).map((o) => o.id)
    ).toEqual(['s1']);
  });

  it('ignores surrounding whitespace in the search term', () => {
    expect(filterOrganizations(ORGS, { search: '  bright  ' }).map((o) => o.id)).toEqual(['v1']);
  });
});

describe('organizationCounts', () => {
  it('counts each state plus a total', () => {
    expect(organizationCounts(ORGS)).toEqual({ all: 3, pending: 1, verified: 1, suspended: 1 });
  });

  it('returns zeroes for an empty list', () => {
    expect(organizationCounts([])).toEqual({ all: 0, pending: 0, verified: 0, suspended: 0 });
  });
});
