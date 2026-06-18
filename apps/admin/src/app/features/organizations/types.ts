export type OrganizationStatus = 'invited' | 'approved' | 'suspended' | 'deactivated';

export interface SuperAdminOrganization {
  id: string;
  name: string;
  type: string;
  status: OrganizationStatus;
  memberCount: number;
  createdAt: string;
}

export interface ListOrganizationsResponse {
  businesses: SuperAdminOrganization[];
}
