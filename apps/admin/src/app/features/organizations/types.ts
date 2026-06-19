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
