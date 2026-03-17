"use client";
import { useRouter } from "next/navigation";
import { useSupport } from "@/app/hooks/useSupport";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import Search from "@/app/ui/inputs/Search";
import Dropdown from "@/app/ui/inputs/Dropdown";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import TicketStatusBadge from "../components/TicketStatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import ActionViewButton from "@/app/ui/primitives/ActionViewButton";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/app/types/ticket";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "open", label: "Open", activeColor: "#EAF3FF", activeTextColor: "#247AED" },
  { value: "in_progress", label: "In Progress", activeColor: "#FEF3E9", activeTextColor: "#F68523" },
  { value: "waiting", label: "Waiting", activeColor: "#F3F4F6", activeTextColor: "#111111" },
  { value: "escalated", label: "Escalated", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
  { value: "resolved", label: "Resolved", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "closed", label: "Closed", activeColor: "#F3F4F6", activeTextColor: "#111111" },
];

const priorityOptions = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type TicketRow = SupportTicket & Record<string, unknown>;

export default function TicketList() {
  const { filteredTickets, loading, filters, setFilters } = useSupport();
  const router = useRouter();

  const columns: Column<TicketRow>[] = [
    {
      label: "Subject",
      key: "subject",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">{item.subject}</span>
      ),
    },
    {
      label: "Category",
      key: "category",
      render: (item) => (
        <span className="text-body-4 text-text-primary">
          {String(item.category).replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => <TicketStatusBadge status={item.status as TicketStatus} />,
    },
    {
      label: "Priority",
      key: "priority",
      render: (item) => <PriorityBadge priority={item.priority as TicketPriority} />,
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
            onClick={() => router.push(`/support/${item.id}`)}
          />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading tickets..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Support Tickets</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Manage customer support tickets across all tenants. Assign agents, set priority levels, and track resolution status.
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
              placeholder="Search tickets..."
              className="max-w-sm"
            />
            <Dropdown
              label="Priority"
              options={priorityOptions}
              value={filters.priority}
              onChange={(value) => setFilters({ priority: value })}
              className="w-48"
            />
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <EmptyState
            title="No tickets found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <GenericTable
            data={filteredTickets as TicketRow[]}
            columns={columns}
            pagination
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
