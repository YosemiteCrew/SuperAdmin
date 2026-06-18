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

/** Patch shape accepted by the super-admin business update endpoint. */
export interface OrganizationStatusPatch {
  isVerified?: boolean;
  isActive?: boolean;
}
