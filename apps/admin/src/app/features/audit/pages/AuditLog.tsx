"use client";
import { useState, useMemo } from "react";
import { useAudit } from "@/app/hooks/useAudit";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import Search from "@/app/ui/inputs/Search";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import { SkeletonListPage } from "@/app/ui/primitives/Skeleton";
import EmptyState from "@/app/ui/primitives/EmptyState";
import type { AuditEntry } from "@/app/types/audit";

const categoryOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "login", label: "Login", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "business", label: "Business", activeColor: "#EAF3FF", activeTextColor: "#247AED" },
  { value: "lead", label: "Lead", activeColor: "#FEF3E9", activeTextColor: "#F68523" },
  { value: "ticket", label: "Ticket", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
  { value: "team", label: "Team", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "break_glass", label: "Break Glass", activeColor: "#F3F4F6", activeTextColor: "#111111" },
];

const categoryPrefixes: Record<string, string[]> = {
  login: ["login", "logout", "mfa_verify"],
  business: ["business_approve", "business_suspend", "business_deactivate"],
  lead: ["lead_status_update", "lead_assign"],
  ticket: ["ticket_assign", "ticket_status_update", "ticket_priority_update"],
  team: ["team_member_add", "team_member_remove"],
  break_glass: ["break_glass_grant", "break_glass_revoke"],
};

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

type AuditRow = AuditEntry & Record<string, unknown>;

export default function AuditLog() {
  const { filteredEntries, loading, filters, setFilters } = useAudit();
  const [category, setCategory] = useState("");

  const displayedEntries = useMemo(() => {
    if (!category) return filteredEntries;
    const prefixes = categoryPrefixes[category];
    if (!prefixes) return filteredEntries;
    return filteredEntries.filter((e) => prefixes.includes(e.action));
  }, [filteredEntries, category]);

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
    return <SkeletonListPage />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Audit Log</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Complete activity trail for compliance. All system actions are logged with actor, timestamp, and details.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full flex items-center justify-between flex-wrap gap-3">
          <StatusFilter
            options={categoryOptions}
            value={category}
            onChange={setCategory}
          />
          <div className="flex items-center gap-3">
            <Search
              value={filters.search}
              onChange={(value) => setFilters({ search: value })}
              placeholder="Search actor, resource, details..."
              className="max-w-sm"
            />
          </div>
        </div>

        {displayedEntries.length === 0 ? (
          <EmptyState
            title="No audit entries found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <GenericTable
            data={displayedEntries as AuditRow[]}
            columns={columns}
            pagination
            pageSize={15}
          />
        )}
      </div>
    </div>
  );
}
