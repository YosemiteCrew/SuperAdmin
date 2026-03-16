"use client";
import { useRouter } from "next/navigation";
import { useLeads } from "@/app/hooks/useLeads";
import PageHeader from "@/app/ui/primitives/PageHeader";
import Search from "@/app/ui/inputs/Search";
import Select from "@/app/ui/inputs/Select";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import LeadStatusBadge from "../components/LeadStatusBadge";
import type { Lead } from "@/app/types/lead";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type LeadRow = Lead & Record<string, unknown>;

export default function LeadsList() {
  const { filteredLeads, loading, filters, setFilters } = useLeads();
  const router = useRouter();

  const columns: Column<LeadRow>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">{item.name}</span>
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
      label: "Company",
      key: "company",
    },
    {
      label: "Source",
      key: "source",
      render: (item) => (
        <Badge tone="neutral">
          {String(item.source).replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => <LeadStatusBadge status={item.status as Lead["status"]} />,
    },
    {
      label: "Assignee",
      key: "assigneeName",
      render: (item) =>
        item.assigneeName ? (
          <span className="text-body-4 text-text-primary">{String(item.assigneeName)}</span>
        ) : (
          <span className="text-caption-1 text-text-tertiary">Unassigned</span>
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
        <Loader variant="inline" label="Loading leads..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        subtitle={`${filteredLeads.length} total leads`}
      />

      <div className="flex items-center gap-4">
        <Search
          value={filters.search}
          onChange={(value) => setFilters({ search: value })}
          placeholder="Search leads..."
          className="flex-1 max-w-sm"
        />
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="w-48"
        />
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads found"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <GenericTable
          data={filteredLeads as LeadRow[]}
          columns={columns}
          onRowClick={(item) => router.push(`/leads/${item.id}`)}
          pagination
          pageSize={10}
        />
      )}
    </div>
  );
}
