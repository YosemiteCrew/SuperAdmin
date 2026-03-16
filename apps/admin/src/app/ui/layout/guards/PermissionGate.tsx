"use client";
import { useAuthStore } from "@/app/stores/authStore";
import { hasPermission, type Permission } from "@/app/lib/permissions";

type Props = {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function PermissionGate({
  permission,
  children,
  fallback,
}: Props) {
  const { user } = useAuthStore();

  if (!user) return null;

  const userPermissions = user.permissions as Permission[];
  if (!hasPermission(userPermissions, permission)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
