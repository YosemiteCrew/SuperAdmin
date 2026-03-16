"use client";
import { useUsers } from "@/app/hooks/useUsers";
import PageHeader from "@/app/ui/primitives/PageHeader";
import Search from "@/app/ui/inputs/Search";
import Select from "@/app/ui/inputs/Select";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import type { AppUser } from "@/app/types/user";

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "pet_parent", label: "Pet Parent" },
  { value: "business_owner", label: "Business Owner" },
  { value: "developer", label: "Developer" },
  { value: "admin", label: "Admin" },
];

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
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
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading users..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        subtitle={`${filteredUsers.length} total users`}
      />

      <div className="flex items-center gap-4">
        <Search
          value={filters.search}
          onChange={(value) => setFilters({ search: value })}
          placeholder="Search users..."
          className="flex-1 max-w-sm"
        />
        <Select
          options={typeOptions}
          value={filters.type}
          onChange={(e) => setFilters({ type: e.target.value })}
          className="w-48"
        />
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="w-48"
        />
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
  );
}
