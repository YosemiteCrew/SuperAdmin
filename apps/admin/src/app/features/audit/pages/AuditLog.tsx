"use client";
import { useAudit } from "@/app/hooks/useAudit";
import PageHeader from "@/app/ui/primitives/PageHeader";
import Search from "@/app/ui/inputs/Search";
import Select from "@/app/ui/inputs/Select";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import type { AuditEntry } from "@/app/types/audit";

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const actionOptions = [
  { value: "", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "mfa_verify", label: "MFA Verify" },
  { value: "lead_status_update", label: "Lead Status Update" },
  { value: "lead_assign", label: "Lead Assign" },
  { value: "business_approve", label: "Business Approve" },
  { value: "business_suspend", label: "Business Suspend" },
  { value: "business_deactivate", label: "Business Deactivate" },
  { value: "ticket_assign", label: "Ticket Assign" },
  { value: "ticket_status_update", label: "Ticket Status Update" },
  { value: "ticket_priority_update", label: "Ticket Priority Update" },
  { value: "team_member_add", label: "Team Member Add" },
  { value: "team_member_remove", label: "Team Member Remove" },
  { value: "break_glass_grant", label: "Break Glass Grant" },
  { value: "break_glass_revoke", label: "Break Glass Revoke" },
  { value: "data_export", label: "Data Export" },
];

type AuditRow = AuditEntry & Record<string, unknown>;

export default function AuditLog() {
  const { filteredEntries, loading, filters, setFilters } = useAudit();

  const columns: Column<AuditRow>[] = [
    {
      label: "Timestamp",
      key: "timestamp",
      render: (item) => (
        <span className="text-caption-1 text-text-primary">
          {formatDateTime(String(item.timestamp))}
        </span>
      ),
    },
    {
      label: "Actor",
      key: "actorName",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {String(item.actorName)}
        </span>
      ),
    },
    {
      label: "Action",
      key: "action",
      render: (item) => (
        <span className="text-body-4 text-text-primary">
          {formatAction(String(item.action))}
        </span>
      ),
    },
    {
      label: "Resource",
      key: "resourceId",
      render: (item) => (
        <span className="text-caption-1 text-text-secondary font-mono">
          {String(item.resourceId)}
        </span>
      ),
    },
    {
      label: "Details",
      key: "details",
      render: (item) => {
        const details = String(item.details);
        return (
          <span title={details} className="text-body-4 text-text-secondary">
            {details.length > 60 ? details.slice(0, 60) + "..." : details}
          </span>
        );
      },
    },
    {
      label: "IP Address",
      key: "ipAddress",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary font-mono">
          {String(item.ipAddress)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading audit entries..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        subtitle="All system activity is logged for compliance"
      />

      <div className="flex items-center gap-4">
        <Search
          value={filters.search}
          onChange={(value) => setFilters({ search: value })}
          placeholder="Search actor, resource, details..."
          className="flex-1 max-w-sm"
        />
        <Select
          options={actionOptions}
          value={filters.action}
          onChange={(e) => setFilters({ action: e.target.value })}
          className="w-56"
        />
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No audit entries found"
          description="Try adjusting your search or filter criteria."
        />
      ) : (
        <GenericTable
          data={filteredEntries as AuditRow[]}
          columns={columns}
          pagination
          pageSize={15}
        />
      )}
    </div>
  );
}
