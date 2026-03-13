"use client";

import Link from "next/link";
import {
  CrmFeaturesDropoff,
  InsightDataPoint,
} from "./crm-features-dropoff";
import {
  CrmPendingVerifications,
  PendingVerificationRow,
} from "./crm-pending-verifications";
import {
  CrmPracticeActivityOverview,
  PracticeActivityColumn,
  PracticeActivityRow,
} from "./crm-practice-activity-overview";
import { CrmTabs } from "./crm-tabs";

export type StatCard = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ReactNode;
};

export type CrmSegmentDashboardProps = {
  title: string;
  breadcrumbLabel: string;
  badgeText: string;
  statCards: StatCard[];
  pendingCount: number;
  pendingRows: PendingVerificationRow[];
  practiceRows: PracticeActivityRow[];
  practiceTotalCount: number;
  practiceColumns: PracticeActivityColumn[];
  mostUsedFeatures: InsightDataPoint[];
  dropOffIndicators: InsightDataPoint[];
  searchPlaceholder?: string;
};

const TrendIcon = ({ trend }: { trend: "up" | "down" }) =>
  trend === "up" ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

export function CrmSegmentDashboard({
  title,
  breadcrumbLabel,
  badgeText,
  statCards,
  pendingCount,
  pendingRows,
  practiceRows,
  practiceTotalCount,
  practiceColumns,
  mostUsedFeatures,
  dropOffIndicators,
  searchPlaceholder,
}: CrmSegmentDashboardProps) {
  return (
    <div className="space-y-8">
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-[#302F2E]">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/client-crm" className="hover:text-[#302F2E]">CRM</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#302F2E]">{breadcrumbLabel}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-[#302F2E]">{title}</h1>
        <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {badgeText}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CrmTabs />
        <select className="rounded-xl border-0 bg-gray-50 px-4 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 text-[#302F2E]">
              {stat.icon}
            </div>
            <p className="text-sm font-normal text-gray-500">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[#302F2E]">{stat.value}</p>
              <span
                className={`flex items-center text-sm font-medium ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                <TrendIcon trend={stat.trend} />
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <CrmPendingVerifications count={pendingCount} rows={pendingRows} />

      <CrmPracticeActivityOverview
        rows={practiceRows}
        totalCount={practiceTotalCount}
        columns={practiceColumns}
        searchPlaceholder={searchPlaceholder}
      />

      <CrmFeaturesDropoff
        mostUsedFeatures={mostUsedFeatures}
        dropOffIndicators={dropOffIndicators}
      />
    </div>
  );
}
