import { ActivityLogs } from "../../components/dashboard/overview/activity-logs";
import { AnalyticsReport } from "../../components/dashboard/charts/analytics-report";
import { AssessmentsOverview } from "../../components/dashboard/overview/assessments-overview";
import {
  NewUserTrendChart,
  UserEngagementChart,
} from "../../components/dashboard/charts/charts";
import { DashboardLayout } from "../../components/dashboard/layout/dashboard-layout";
import { DashboardIntro } from "../../components/dashboard/common/intro";
import { SectionHeader } from "../../components/dashboard/layout/section-header";
import { SocialMediaTable } from "../../components/dashboard/common/social-media-table";
import { StatCards } from "../../components/dashboard/common/stat-cards";
import { TotalRevenue } from "../../components/dashboard/charts/total-revenue";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardIntro />
          <div className="mt-8 space-y-8">
            <StatCards />
            <div>
              <SectionHeader
                title="New User Trend"
                rightElement={
                  <select className="rounded-[25px] border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
                    <option>All</option>
                  </select>
                }
              />
              <NewUserTrendChart />
            </div>
            <div>
              <SectionHeader
                title="User Engagement"
                rightElement={
                  <select className="rounded-[25px] border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
                    <option>Hospitals</option>
                  </select>
                }
              />
              <UserEngagementChart />
            </div>
            <div>
              <SectionHeader title="Assessments Overview" />
              <AssessmentsOverview />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <SectionHeader title="Analytics & Report" />
                <AnalyticsReport />
              </div>
              <div>
                <SectionHeader title="Social Media Overview" />
                <SocialMediaTable />
              </div>
            </div>
            <div>
              <SectionHeader
                title="Total Revenue"
                rightElement={
                  <select className="rounded-[25px] border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
                    <option>This Month Revenue</option>
                  </select>
                }
              />
              <TotalRevenue />
            </div>
            <div>
              <SectionHeader title="Activity Logs" />
              <ActivityLogs />
            </div>
          </div>
    </DashboardLayout>
  );
}
