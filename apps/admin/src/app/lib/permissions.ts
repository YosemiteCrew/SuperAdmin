export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  LEADS_VIEW: "leads:view",
  LEADS_EDIT: "leads:edit",
  BUSINESSES_VIEW: "businesses:view",
  BUSINESSES_EDIT: "businesses:edit",
  SUPPORT_VIEW: "support:view",
  SUPPORT_EDIT: "support:edit",
  TEAM_VIEW: "team:view",
  TEAM_EDIT: "team:edit",
  ANALYTICS_VIEW: "analytics:view",
  USERS_VIEW: "users:view",
  DEVELOPERS_VIEW: "developers:view",
  BREAK_GLASS_VIEW: "break-glass:view",
  BREAK_GLASS_EDIT: "break-glass:edit",
  AUDIT_VIEW: "audit:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_EDIT,
    PERMISSIONS.BUSINESSES_VIEW,
    PERMISSIONS.SUPPORT_VIEW,
    PERMISSIONS.SUPPORT_EDIT,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.USERS_VIEW,
  ],
};

export function hasPermission(
  userPermissions: Permission[],
  required: Permission
): boolean {
  return userPermissions.includes(required);
}
