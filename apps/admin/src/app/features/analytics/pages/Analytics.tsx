"use client";
import dynamic from "next/dynamic";
import { useAnalytics } from "@/app/hooks/useAnalytics";
import PageHeader from "@/app/ui/primitives/PageHeader";
import StatCard from "@/app/ui/cards/StatCard";
import DetailCard from "@/app/ui/cards/DetailCard";
import { SkeletonListPage } from "@/app/ui/primitives/Skeleton";

const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <div className="h-[370px] bg-neutral-100 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[330px] bg-neutral-100 rounded-2xl animate-pulse" />
        <div className="h-[330px] bg-neutral-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  ),
});

export default function Analytics() {
  const { summary, loading } = useAnalytics();

  if (loading || !summary) {
    return <SkeletonListPage cols={4} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" subtitle="Platform performance overview" />

      {/* Row 1: KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.kpiTiles.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={
              kpi.label.includes("Rate")
                ? `${kpi.value}%`
                : kpi.value.toLocaleString()
            }
            trend={
              kpi.trend !== "flat"
                ? {
                    direction: kpi.trend,
                    percentage: `${Math.abs(kpi.changePercent)}%`,
                  }
                : undefined
            }
          />
        ))}
      </div>

      {/* Charts - lazy loaded */}
      <AnalyticsCharts
        userTrend={summary.userTrend}
        businessTrend={summary.businessTrend}
        leadsTrend={summary.leadsTrend}
      />

      {/* Row 4: Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DetailCard
          title="Platform Summary"
          rows={[
            {
              label: "Total App Users",
              value: summary.totalAppUsers.toLocaleString(),
            },
            {
              label: "Total PMS Users",
              value: summary.totalPmsUsers.toLocaleString(),
            },
            {
              label: "Active Businesses",
              value: summary.activeBusinesses.toLocaleString(),
            },
          ]}
        />
        <DetailCard
          title="Acquisition"
          rows={[
            {
              label: "Total Leads",
              value: summary.totalLeads.toLocaleString(),
            },
            {
              label: "Conversion Rate",
              value: `${summary.conversionRate}%`,
            },
          ]}
        />
      </div>
    </div>
  );
}
