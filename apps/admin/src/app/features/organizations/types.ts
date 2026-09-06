export type BusinessType = 'HOSPITAL' | 'BREEDER' | 'BOARDER' | 'GROOMER';

/**
 * A platform business ("organization") as the super-admin panel sees it.
 * Mirrors the Yosemite backend organization model: `isVerified` gates whether a
 * business is visible to pet parents in the mobile app, and `isActive` toggles
 * suspension.
 */
export interface SuperAdminOrganization {
  id: string;
  name: string;
  type: BusinessType;
  isVerified: boolean;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  taxId?: string;
  phoneNo?: string;
  website?: string;
}

export interface ListOrganizationsResponse {
  businesses: SuperAdminOrganization[];
}

export type BusinessSubType = 'COMPANION' | 'ANIMAL' | 'PATIENT';

export interface OrganizationAddress {
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/** Full business record for the organization detail page. */
export interface SuperAdminOrganizationDetail extends SuperAdminOrganization {
  subType?: BusinessSubType;
  DUNSNumber?: string;
  imageURL?: string;
  address?: OrganizationAddress;
  healthAndSafetyCertNo?: string;
  animalWelfareComplianceCertNo?: string;
  fireAndEmergencyCertNo?: string;
  googlePlacesId?: string;
  averageRating?: number;
  ratingCount?: number;
  updatedAt?: string;
}

export interface GetOrganizationResponse {
  business: SuperAdminOrganizationDetail;
}

/** Patch shape accepted by the super-admin business update endpoint. */
export interface OrganizationStatusPatch {
  isVerified?: boolean;
  isActive?: boolean;
}

/**
 * One active membership of an organisation, as `GET
 * /v1/super-admin/businesses/:id/members` returns it.
 *
 * `userId` is the auth identifier the panel's own user pages are keyed on
 * (`/users/<userId>`), which is what makes this the route from "this clinic
 * has a problem" to the individual account that carries the answer.
 */
export interface SuperAdminOrganizationMember {
  userId: string;
  roleCode: string;
  roleDisplay?: string;
  since: string;
}

export interface ListOrganizationMembersResponse {
  members: SuperAdminOrganizationMember[];
}
