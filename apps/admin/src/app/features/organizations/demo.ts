import type { SuperAdminOrganization, SuperAdminOrganizationDetail } from './types';

/**
 * Sample businesses for design/QA review of the Organizations UI before the
 * backend `/v1/super-admin/businesses` endpoint exists. Surfaced only when a
 * page is visited with `?demo=1`, so it never affects normal operation.
 *
 * `demo-1` points at https://example.com (whose page contains "Example Domain"),
 * so the live website corroboration check passes; `demo-3` uses an unresolvable
 * domain to demonstrate a failed check.
 */
export const DEMO_ORGANIZATION_DETAILS: Record<string, SuperAdminOrganizationDetail> = {
  'demo-1': {
    id: 'demo-1',
    name: 'Example Domain Veterinary',
    type: 'HOSPITAL',
    subType: 'COMPANION',
    isVerified: false,
    isActive: true,
    memberCount: 6,
    createdAt: '2026-05-02',
    updatedAt: '2026-06-10',
    website: 'https://example.com',
    phoneNo: '+1 415 555 0142',
    taxId: 'EIN-99-1234567',
    DUNSNumber: '07-842-1199',
    address: {
      addressLine: '500 Mission St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
    },
    healthAndSafetyCertNo: 'HS-2026-0098',
    animalWelfareComplianceCertNo: 'AW-2026-0451',
    fireAndEmergencyCertNo: 'FE-2026-0177',
    googlePlacesId: 'ChIJ-demo-1',
    averageRating: 4.7,
    ratingCount: 212,
  },
  'demo-2': {
    id: 'demo-2',
    name: 'Bright Paws Grooming',
    type: 'GROOMER',
    subType: 'COMPANION',
    isVerified: true,
    isActive: true,
    memberCount: 3,
    createdAt: '2026-03-18',
    updatedAt: '2026-05-30',
    website: 'https://example.org',
    phoneNo: '+1 206 555 0110',
    taxId: 'EIN-88-7654321',
    address: {
      addressLine: '12 Pike St',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      country: 'US',
    },
    healthAndSafetyCertNo: 'HS-2026-0042',
    googlePlacesId: 'ChIJ-demo-2',
    averageRating: 4.2,
    ratingCount: 64,
  },
  'demo-3': {
    id: 'demo-3',
    name: 'Acme Boarding Co',
    type: 'BOARDER',
    subType: 'ANIMAL',
    isVerified: true,
    isActive: false,
    memberCount: 2,
    createdAt: '2025-11-09',
    updatedAt: '2026-04-01',
    website: 'https://this-domain-does-not-resolve-xyz.example',
    phoneNo: '+1 312 555 0190',
    address: {
      addressLine: '88 Lake Dr',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
    },
  },
};

export const DEMO_ORGANIZATIONS: SuperAdminOrganization[] =
  Object.values(DEMO_ORGANIZATION_DETAILS);

export function getDemoOrganization(id: string): SuperAdminOrganizationDetail | null {
  return DEMO_ORGANIZATION_DETAILS[id] ?? null;
}
