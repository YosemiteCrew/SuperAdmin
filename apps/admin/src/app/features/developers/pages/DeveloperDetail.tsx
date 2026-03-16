"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDeveloperStore } from "@/app/stores/developerStore";
import PageHeader from "@/app/ui/primitives/PageHeader";
import DetailCard from "@/app/ui/cards/DetailCard";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import type { DeveloperApp } from "@/app/types/developer";

const statusTone: Record<string, "neutral" | "success" | "danger"> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

const appStatusTone: Record<
  string,
  "neutral" | "success" | "warning" | "danger"
> = {
  active: "success",
  pending_review: "warning",
  rejected: "danger",
  suspended: "neutral",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAppStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type AppRow = DeveloperApp & Record<string, unknown>;

export default function DeveloperDetail({ id }: { id: string }) {
  const {
    selectedDeveloper,
    apps,
    loading,
    fetchDeveloperById,
    fetchDeveloperApps,
  } = useDeveloperStore();
  const router = useRouter();

  useEffect(() => {
    fetchDeveloperById(id);
    fetchDeveloperApps(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !selectedDeveloper) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading developer..." />
      </div>
    );
  }

  const appColumns: Column<AppRow>[] = [
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
      label: "Description",
      key: "description",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {(item.description as string).length > 50
            ? `${(item.description as string).slice(0, 50)}...`
            : (item.description as string)}
        </span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={appStatusTone[item.status as string] ?? "neutral"}>
          {formatAppStatus(item.status as string)}
        </Badge>
      ),
    },
    {
      label: "API Key",
      key: "apiKey",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary font-mono">
          {(item.apiKey as string).slice(0, 8)}...
        </span>
      ),
    },
    {
      label: "Calls Today",
      key: "callsToday",
    },
    {
      label: "Total Calls",
      key: "callsTotal",
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
  ];

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.push("/developers")}
        className="flex items-center gap-2 text-body-4 text-text-tertiary hover:text-text-primary transition-colors w-fit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M5 12L12 19M5 12L12 5" />
        </svg>
        Back to Developers
      </button>

      <PageHeader
        title={selectedDeveloper.name}
        subtitle={`Developer`}
        action={
          <Badge tone={statusTone[selectedDeveloper.status] ?? "neutral"}>
            {selectedDeveloper.status.charAt(0).toUpperCase() +
              selectedDeveloper.status.slice(1)}
          </Badge>
        }
      />

      <DetailCard
        title="Developer Information"
        rows={[
          { label: "Name", value: selectedDeveloper.name },
          { label: "Email", value: selectedDeveloper.email },
          { label: "Company", value: selectedDeveloper.company },
          {
            label: "Status",
            value: (
              <Badge tone={statusTone[selectedDeveloper.status] ?? "neutral"}>
                {selectedDeveloper.status.charAt(0).toUpperCase() +
                  selectedDeveloper.status.slice(1)}
              </Badge>
            ),
          },
          { label: "Created", value: formatDate(selectedDeveloper.createdAt) },
        ]}
      />

      <div>
        <h2 className="text-heading-2 text-text-primary mb-4">
          Developer Apps
        </h2>
        <GenericTable
          data={apps as AppRow[]}
          columns={appColumns}
          emptyMessage="No apps found for this developer."
        />
      </div>
    </div>
  );
}
