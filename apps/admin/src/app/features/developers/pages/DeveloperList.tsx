"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDevelopers } from "@/app/hooks/useDevelopers";
import StatusFilter from "@/app/ui/primitives/StatusFilter";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import { SkeletonListPage } from "@/app/ui/primitives/Skeleton";
import EmptyState from "@/app/ui/primitives/EmptyState";
import ActionViewButton from "@/app/ui/primitives/ActionViewButton";
import type { Developer } from "@/app/types/developer";

const statusOptions = [
  { value: "", label: "All", activeColor: "#247AED", activeTextColor: "#FFFFFF" },
  { value: "active", label: "Active", activeColor: "#E6F4EF", activeTextColor: "#33A57D" },
  { value: "inactive", label: "Inactive", activeColor: "#F3F4F6", activeTextColor: "#111111" },
  { value: "suspended", label: "Suspended", activeColor: "#FDEBEA", activeTextColor: "#EA3729" },
];

const statusTone: Record<string, "neutral" | "success" | "danger"> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type DeveloperRow = Developer & Record<string, unknown>;

export default function DeveloperList() {
  const { developers, loading } = useDevelopers();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");

  const filteredDevelopers = useMemo(() => {
    if (!statusFilter) return developers;
    return developers.filter((d) => d.status === statusFilter);
  }, [developers, statusFilter]);

  const columns: Column<DeveloperRow>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">
          {item.name}
        </span>
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
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={statusTone[item.status as string] ?? "neutral"}>
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
    {
      label: "Apps Count",
      key: "appsCount",
    },
    {
      label: "Created",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(item.createdAt as string)}
        </span>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      render: (item) => (
        <ActionViewButton
            onClick={() => router.push(`/developers/${item.id}`)}
          />
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
          <h1 className="text-text-primary text-heading-1">Developers</h1>
          <p className="text-body-3 text-text-secondary max-w-3xl">
            Manage developer accounts and API access. Monitor app registrations and usage.
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="w-full flex items-center justify-between flex-wrap gap-3">
          <StatusFilter
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {filteredDevelopers.length === 0 ? (
          <EmptyState
            title="No developers found"
            description="Try adjusting your filter criteria."
          />
        ) : (
          <GenericTable
            data={filteredDevelopers as DeveloperRow[]}
            columns={columns}
            pagination
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
