"use client";
import { useUsers } from "@/app/hooks/useUsers";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import { SkeletonListPage } from "@/app/ui/primitives/Skeleton";
import EmptyState from "@/app/ui/primitives/EmptyState";
import type { AppUser } from "@/app/types/user";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "active", label: "Active", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "inactive", label: "Inactive", activeColor: "#F3F4F6", activeTextColor: "#111111" },
  { value: "suspended", label: "Suspended", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
];

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "pet_parent", label: "Pet Parent" },
  { value: "business_owner", label: "Business Owner" },
  { value: "developer", label: "Developer" },
  { value: "admin", label: "Admin" },
];

const typeTone: Record<string, "neutral" | "brand" | "success" | "warning"> = {
  pet_parent: "neutral",
  business_owner: "brand",
  developer: "success",
  admin: "warning",
};

const statusTone: Record<string, "neutral" | "success" | "danger"> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type UserRow = AppUser & Record<string, unknown>;

export default function UserList() {
  const { filteredUsers, loading, filters, setFilters } = useUsers();

  const columns: Column<UserRow>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {item.name}
        </span>
      ),
    },
    {
      label: "Email",
      key: "email",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">{item.email}</span>
      ),
    },
    {
      label: "Type",
      key: "type",
      render: (item) => (
        <Badge tone={typeTone[item.type as string] ?? "neutral"}>
          {formatType(item.type as string)}
        </Badge>
      ),
    },
    {
      label: "Auth Provider",
      key: "authProvider",
      render: (item) => (
        <span className="text-body-4 text-text-primary capitalize">
          {item.authProvider as string}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={statusTone[item.status as string] ?? "neutral"}>
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
    {
      label: "Last Login",
      key: "lastLoginAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(item.lastLoginAt as string)}
        </span>
      ),
    },
    {
      label: "Created",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(item.createdAt as string)}
        </span>
      ),
    },
  ];

  if (loading) {
    return <SkeletonListPage />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Users</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            View all platform users across Cognito and Firebase. Monitor activity and account status.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full flex items-center justify-between flex-wrap gap-3">
          <StatusFilter
            options={statusOptions}
            value={filters.status}
            onChange={(value) => setFilters({ status: value })}
          />
          <div className="flex items-center gap-3">
            <Dropdown
              label="Type"
              options={typeOptions}
              value={filters.type}
              onChange={(value) => setFilters({ type: value })}
              className="w-48"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <GenericTable
            data={filteredUsers as UserRow[]}
            columns={columns}
            pagination
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
