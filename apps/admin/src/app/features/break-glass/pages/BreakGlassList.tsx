"use client";
import { useState, useMemo } from "react";
import { useBreakGlass } from "@/app/hooks/useBreakGlass";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import { Primary, Danger } from "@/app/ui/primitives/Button";
import CreateGrantModal from "../components/CreateGrantModal";
import RevokeGrantModal from "../components/RevokeGrantModal";
import type { BreakGlassGrant, GrantStatus } from "@/app/types/break-glass";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "active", label: "Active", activeColor: "#FEF3E9", activeTextColor: "#F68523" },
  { value: "expired", label: "Expired", activeColor: "#F3F4F6", activeTextColor: "#111111" },
  { value: "revoked", label: "Revoked", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
];

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScope(scope: string) {
  return scope
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const statusTone: Record<GrantStatus, "warning" | "neutral" | "danger"> = {
  active: "warning",
  expired: "neutral",
  revoked: "danger",
};

type GrantRow = BreakGlassGrant & Record<string, unknown>;

export default function BreakGlassList() {
  const { grants, loading, createGrant, revokeGrant } = useBreakGlass();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<BreakGlassGrant | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filteredGrants = useMemo(() => {
    if (!statusFilter) return grants;
    return grants.filter((g) => g.status === statusFilter);
  }, [grants, statusFilter]);

  const columns: Column<GrantRow>[] = [
    {
      label: "Granted To",
      key: "grantedToName",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {String(item.grantedToName)}
        </span>
      ),
    },
    {
      label: "Scope",
      key: "scope",
      render: (item) => formatScope(String(item.scope)),
    },
    {
      label: "Reason",
      key: "reason",
      render: (item) => {
        const reason = String(item.reason);
        return (
          <span title={reason} className="text-body-4 text-text-primary">
            {reason.length > 40 ? reason.slice(0, 40) + "..." : reason}
          </span>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={statusTone[item.status as GrantStatus]}>
          {String(item.status).charAt(0).toUpperCase() + String(item.status).slice(1)}
        </Badge>
      ),
    },
    {
      label: "Expires At",
      key: "expiresAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDateTime(String(item.expiresAt))}
        </span>
      ),
    },
    {
      label: "Created",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDateTime(String(item.createdAt))}
        </span>
      ),
    },
    {
      label: "Actions",
      key: "id",
      render: (item) =>
        item.status === "active" ? (
          <Danger
            onClick={() => {
              setRevokeTarget(item as unknown as BreakGlassGrant);
            }}
            className="!px-4 !py-1.5 !text-caption-1"
          >
            Revoke
          </Danger>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading grants..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Break Glass Access</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Manage time-bound emergency access grants. All grants are audited and require justification.
          </p>
        </div>
        <Primary onClick={() => setCreateOpen(true)}>Create Grant</Primary>
      </div>

      <div className="rounded-2xl bg-brand-100 p-4">
        <p className="text-body-4 text-text-primary">
          Break glass access provides temporary, audited access to sensitive data. All grants require a reason and ticket ID.
        </p>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full flex items-center justify-between flex-wrap gap-3">
          <StatusFilter
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <GenericTable
          data={filteredGrants as GrantRow[]}
          columns={columns}
          pagination
          pageSize={10}
        />
      </div>

      <CreateGrantModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createGrant}
      />

      {revokeTarget && (
        <RevokeGrantModal
          isOpen={!!revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onConfirm={() => {
            revokeGrant(revokeTarget.id);
            setRevokeTarget(null);
          }}
          grantedToName={revokeTarget.grantedToName}
        />
      )}
    </div>
  );
}
