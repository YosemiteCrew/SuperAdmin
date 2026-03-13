"use client";

import Link from "next/link";
import { CrmFeaturesDropoff } from "./crm-features-dropoff";
import { CrmPendingReviewsApprovals } from "./crm-pending-reviews-approvals";
import { CrmTabs } from "./crm-tabs";
import { DeveloperActivityOverview } from "../overview/developer-activity-overview";
import { DEVELOPERS_DATA } from "./crm-developers-data";
import type { StatCard } from "./crm-segment-dashboard";

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

export function CrmDevelopersDashboard() {
  return (
    <div className="space-y-8">
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-[#302F2E]">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/client-crm" className="hover:text-[#302F2E]">CRM</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#302F2E]">Developers</span>
      </nav>

      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold text-[#302F2E]">CRM Dashboard - Developers</h1>
        <span className="inline-flex items-center gap-2 rounded-[25px] bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          3 Projects Pending Approval
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CrmTabs />
        <select className="rounded-[25px] border-0 bg-gray-50 px-4 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {DEVELOPERS_DATA.statCards.map((stat: StatCard) => (
          <div
            key={stat.label}
            className="rounded-[25px] border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[25px] border border-gray-200 text-[#302F2E]">
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

      <CrmPendingReviewsApprovals
        count={3}
        rows={DEVELOPERS_DATA.pendingReviewRows}
      />

      <DeveloperActivityOverview
        rows={DEVELOPERS_DATA.developerActivityRows}
        totalCount={140}
      />

      <CrmFeaturesDropoff
        mostUsedFeatures={DEVELOPERS_DATA.mostUsedTools}
        dropOffIndicators={DEVELOPERS_DATA.dropOffIndicators}
        leftChartTitle="Most Used Tools (30d)"
      />
    </div>
  );
}
