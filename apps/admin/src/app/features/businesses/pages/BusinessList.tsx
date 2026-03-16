"use client";
import { useRouter } from "next/navigation";
import { useBusinesses } from "@/app/hooks/useBusinesses";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import Search from "@/app/ui/inputs/Search";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import BusinessStatusBadge from "../components/BusinessStatusBadge";
import type { Business, BusinessStatus } from "@/app/types/business";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "pending", label: "Pending", activeColor: "#FEF3E9", activeTextColor: "#F68523" },
  { value: "active", label: "Active", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "suspended", label: "Suspended", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
  { value: "deactivated", label: "Deactivated", activeColor: "#F3F4F6", activeTextColor: "#111111" },
  { value: "invited", label: "Invited", activeColor: "#EAF3FF", activeTextColor: "#247AED" },
];

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "BREEDER", label: "Breeder" },
  { value: "BOARDER", label: "Boarder" },
  { value: "GROOMER", label: "Groomer" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type BusinessRow = Business & Record<string, unknown>;

export default function BusinessList() {
  const { filteredBusinesses, loading, filters, setFilters } = useBusinesses();
  const router = useRouter();

  const columns: Column<BusinessRow>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">{item.name}</span>
      ),
    },
    {
      label: "Type",
      key: "type",
      render: (item) => (
        <span className="text-body-4 text-text-primary">
          {String(item.type).charAt(0) + String(item.type).slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => <BusinessStatusBadge status={item.status as BusinessStatus} />,
    },
    {
      label: "Owner",
      key: "ownerName",
      render: (item) => (
        <span className="text-body-4 text-text-primary">{String(item.ownerName)}</span>
      ),
    },
    {
      label: "Plan",
      key: "plan",
      render: (item) => (
        <span className="text-body-4 text-text-primary capitalize">{String(item.plan)}</span>
      ),
    },
    {
      label: "Rating",
      key: "averageRating",
      render: (item) => (
        <span className="text-body-4 text-text-primary">
          {Number(item.averageRating).toFixed(1)} ({String(item.ratingCount)})
        </span>
      ),
    },
    {
      label: "Created",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(String(item.createdAt))}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading businesses..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Businesses</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            View and manage all registered businesses. Approve new registrations, suspend or deactivate accounts, and filter by business type.
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
            <Search
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search businesses..."
              className="max-w-sm"
            />
            <Dropdown
              label="Type"
              options={typeOptions}
              value={filters.type}
              onChange={(value) => setFilters({ type: value })}
              className="w-48"
            />
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <EmptyState
            title="No businesses found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <GenericTable
            data={filteredBusinesses as BusinessRow[]}
            columns={columns}
            onRowClick={(item) => router.push(`/businesses/${item.id}`)}
            pagination
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
