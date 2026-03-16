"use client";
import type { ReactNode } from "react";
import { useAuthStore } from "@/app/stores/authStore";
import { hasPermission, type Permission } from "@/app/lib/permissions";

type Props = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function PermissionGate({
  permission,
  children,
  fallback,
}: Props) {
  const { user } = useAuthStore();

  if (!user) return null;

  if (!hasPermission(user.permissions, permission)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
