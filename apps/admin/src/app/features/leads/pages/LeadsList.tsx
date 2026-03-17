"use client";
import { useRouter } from "next/navigation";
import { useLeads } from "@/app/hooks/useLeads";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import Search from "@/app/ui/inputs/Search";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import LeadStatusBadge from "../components/LeadStatusBadge";
import ActionViewButton from "@/app/ui/primitives/ActionViewButton";
import type { Lead } from "@/app/types/lead";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "new", label: "New", activeColor: "#EAF3FF", activeTextColor: "#247AED" },
  { value: "contacted", label: "Contacted", activeColor: "#FEF3E9", activeTextColor: "#F68523" },
  { value: "qualified", label: "Qualified", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "converted", label: "Converted", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "lost", label: "Lost", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
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
    {
      label: "Actions",
      key: "actions",
      render: (item) => (
        <ActionViewButton
            onClick={() => router.push(`/leads/${item.id}`)}
          />
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
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Leads</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Track and manage all inbound leads. Update statuses, assign team members, and monitor your sales pipeline.
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
              placeholder="Search leads..."
              className="max-w-sm"
            />
          </div>
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
            pagination
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
