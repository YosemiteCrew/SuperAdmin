"use client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useDashboard } from "@/app/hooks/useDashboard";
import PageHeader from "@/app/ui/primitives/PageHeader";
import StatCard from "@/app/ui/cards/StatCard";
import { GenericTable, type Column } from "@/app/ui/tables/GenericTable";
import Badge from "@/app/ui/primitives/Badge";
import Loader from "@/app/ui/overlays/Loader/Loader";
import ActionViewButton from "@/app/ui/primitives/ActionViewButton";
import type { Lead } from "@/app/types/lead";
import type { SupportTicket } from "@/app/types/ticket";

const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      <div className="h-[290px] bg-neutral-100 rounded-2xl animate-pulse" />
      <div className="h-[290px] bg-neutral-100 rounded-2xl animate-pulse" />
    </div>
  ),
});

const leadStatusTone: Record<string, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  lost: "danger",
};

const ticketPriorityTone: Record<string, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const ticketStatusTone: Record<string, "neutral" | "brand" | "success" | "warning" | "danger"> = {
  open: "brand",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { loading, stats, recentLeads, recentTickets } = useDashboard();
  const router = useRouter();

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader variant="inline" label="Loading dashboard..." />
      </div>
    );
  }

  const leadColumns: Column<Lead>[] = [
    {
      label: "Name",
      key: "name",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">{item.name}</span>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={leadStatusTone[item.status] ?? "neutral"}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      label: "Source",
      key: "source",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary capitalize">
          {item.source.replace("_", " ")}
        </span>
      ),
    },
    {
      label: "Date",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(item.createdAt)}
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

  const ticketColumns: Column<SupportTicket>[] = [
    {
      label: "Subject",
      key: "subject",
      render: (item) => (
        <span className="text-body-4-emphasis text-text-primary">{item.subject}</span>
      ),
    },
    {
      label: "Priority",
      key: "priority",
      render: (item) => (
        <Badge tone={ticketPriorityTone[item.priority] ?? "neutral"}>
          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
        </Badge>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (item) => (
        <Badge tone={ticketStatusTone[item.status] ?? "neutral"}>
          {item.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      ),
    },
    {
      label: "Date",
      key: "createdAt",
      render: (item) => (
        <span className="text-caption-1 text-text-tertiary">
          {formatDate(item.createdAt)}
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

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader title="Dashboard" subtitle="Overview of your admin panel" />

      {/* Stat Cards - responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          trend={{ direction: "up", percentage: "12%" }}
        />
        <StatCard
          label="Active Businesses"
          value={stats.activeBusinesses}
          trend={{ direction: "up", percentage: "8%" }}
        />
        <StatCard
          label="Open Tickets"
          value={stats.openTickets}
          trend={{ direction: "down", percentage: "5%" }}
        />
        <StatCard label="Team Members" value={stats.teamMembers} />
      </div>

      {/* Charts - lazy loaded */}
      <DashboardCharts />

      {/* Recent Tables - stack on mobile/tablet, side by side on large desktop */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-neutral-0 border border-card-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-body-3-emphasis sm:text-heading-3 text-text-primary">
              Recent Leads
            </h2>
            <button
              onClick={() => router.push("/leads")}
              className="text-caption-1 text-brand-text font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[400px] px-4 sm:px-0">
              <GenericTable
                data={recentLeads as (Lead & Record<string, unknown>)[]}
                columns={leadColumns as Column<Lead & Record<string, unknown>>[]}
              />
            </div>
          </div>
        </div>

        <div className="bg-neutral-0 border border-card-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-body-3-emphasis sm:text-heading-3 text-text-primary">
              Recent Tickets
            </h2>
            <button
              onClick={() => router.push("/support")}
              className="text-caption-1 text-brand-text font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[400px] px-4 sm:px-0">
              <GenericTable
                data={recentTickets as (SupportTicket & Record<string, unknown>)[]}
                columns={ticketColumns as Column<SupportTicket & Record<string, unknown>>[]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
