"use client";
import { useRouter } from "next/navigation";
import { useSupport } from "@/app/hooks/useSupport";
import PageHeader from "@/app/ui/primitives/PageHeader";
import Search from "@/app/ui/inputs/Search";
import Select from "@/app/ui/inputs/Select";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import TicketStatusBadge from "../components/TicketStatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/app/types/ticket";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
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
      <PageHeader
        title="Support Tickets"
        subtitle={`${filteredTickets.length} total tickets`}
      />

      <div className="flex items-center gap-4 flex-wrap">
        <Search
          value={filters.search}
          onChange={(value) => setFilters({ search: value })}
          placeholder="Search tickets..."
          className="flex-1 max-w-sm"
        />
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="w-48"
        />
        <Select
          options={priorityOptions}
          value={filters.priority}
          onChange={(e) => setFilters({ priority: e.target.value })}
          className="w-48"
        />
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
          onRowClick={(item) => router.push(`/support/${item.id}`)}
          pagination
          pageSize={10}
        />
      )}
    </div>
  );
}
