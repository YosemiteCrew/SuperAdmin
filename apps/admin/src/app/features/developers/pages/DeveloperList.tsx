"use client";
import { useRouter } from "next/navigation";
import { useDevelopers } from "@/app/hooks/useDevelopers";
import PageHeader from "@/app/ui/primitives/PageHeader";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import type { Developer } from "@/app/types/developer";

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
      key: "id",
      render: (item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/developers/${item.id}`);
          }}
          className="text-caption-1 text-brand-text font-medium hover:underline"
        >
          View
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading developers..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Developers"
        subtitle={`${developers.length} total developers`}
      />

      <GenericTable
        data={developers as DeveloperRow[]}
        columns={columns}
        onRowClick={(item) => router.push(`/developers/${item.id}`)}
        pagination
        pageSize={10}
      />
    </div>
  );
}
