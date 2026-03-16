"use client";
import { useRouter } from "next/navigation";
import { useBusinesses } from "@/app/hooks/useBusinesses";
import PageHeader from "@/app/ui/primitives/PageHeader";
import Search from "@/app/ui/inputs/Search";
import Select from "@/app/ui/inputs/Select";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import BusinessStatusBadge from "../components/BusinessStatusBadge";
import type { Business, BusinessStatus } from "@/app/types/business";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deactivated", label: "Deactivated" },
  { value: "invited", label: "Invited" },
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
      <PageHeader
        title="Businesses"
        subtitle={`${filteredBusinesses.length} total businesses`}
      />

      <div className="flex items-center gap-4 flex-wrap">
        <Search
          value={filters.search}
          onChange={(value) => setFilters({ search: value })}
          placeholder="Search businesses..."
          className="flex-1 max-w-sm"
        />
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="w-48"
        />
        <Select
          options={typeOptions}
          value={filters.type}
          onChange={(e) => setFilters({ type: e.target.value })}
          className="w-48"
        />
        <label className="flex items-center gap-2 text-body-4 text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.invitedOnly}
            onChange={(e) => setFilters({ invitedOnly: e.target.checked })}
            className="w-4 h-4 rounded border-card-border accent-brand-950"
          />
          Invited Only
        </label>
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
  );
}
