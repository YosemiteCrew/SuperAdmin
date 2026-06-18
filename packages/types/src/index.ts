// Domain types for the superadmin panel.

export interface AdminUser {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  status: 'active' | 'suspended' | 'deleted';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}
