"use client";
import { useState, useMemo } from "react";
import { useTeam } from "@/app/hooks/useTeam";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import { Primary } from "@/app/ui/primitives/Button";
import { Danger } from "@/app/ui/primitives/Button";
import Loader from "@/app/ui/overlays/Loader/Loader";
import EmptyState from "@/app/ui/primitives/EmptyState";
import AddMemberModal from "../components/AddMemberModal";
import RemoveMemberModal from "../components/RemoveMemberModal";
import type { TeamMember, TeamRole, TeamMemberStatus } from "@/app/types/team";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "active", label: "Active", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "inactive", label: "Inactive", activeColor: "#F3F4F6", activeTextColor: "#111111" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const roleTones: Record<TeamRole, "brand" | "success" | "neutral"> = {
  SUPER_ADMIN: "brand",
  ADMIN: "success",
  SUPPORT: "neutral",
};

const roleLabels: Record<TeamRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPPORT: "Support",
};

const statusTones: Record<TeamMemberStatus, "success" | "neutral"> = {
  active: "success",
  inactive: "neutral",
};

type TeamRow = TeamMember & Record<string, unknown>;

export default function TeamList() {
  const { members, loading, addMember, removeMember } = useTeam();
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const filteredMembers = useMemo(() => {
    if (!statusFilter) return members;
    return members.filter((m) => m.status === statusFilter);
  }, [members, statusFilter]);

  const columns: Column<TeamRow>[] = [
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
      label: "Role",
      key: "role",
      render: (item) => (
        <Badge tone={roleTones[item.role as TeamRole]}>
          {roleLabels[item.role as TeamRole]}
        </Badge>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={statusTones[item.status as TeamMemberStatus]}>
          {String(item.status).charAt(0).toUpperCase() + String(item.status).slice(1)}
        </Badge>
      ),
    },
    {
      label: "Joined",
      key: "joinedAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(String(item.joinedAt))}
        </span>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      render: (item) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Danger
            onClick={() => {
              setRemoveTarget(item as unknown as TeamMember);
            }}
          >
            Remove
          </Danger>
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading team members..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center w-full flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-heading-1">Team Members</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Manage your admin team. Add new members, assign roles, and control access permissions.
          </p>
        </div>
        <Primary onClick={() => setShowAddModal(true)}>Add Member</Primary>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full flex items-center justify-between flex-wrap gap-3">
          <StatusFilter
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {filteredMembers.length === 0 ? (
          <EmptyState
            title="No team members"
            description="Add your first team member to get started."
          />
        ) : (
          <GenericTable
            data={filteredMembers as TeamRow[]}
            columns={columns}
          />
        )}
      </div>

      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addMember}
      />

      <RemoveMemberModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        memberName={removeTarget?.name ?? ""}
        onConfirm={() => {
          if (removeTarget) {
            removeMember(removeTarget.id);
          }
        }}
      />
    </div>
  );
}
