import { ActivityLogs } from "../../components/dashboard/activity-logs";
import { AnalyticsReport } from "../../components/dashboard/analytics-report";
import { AssessmentsOverview } from "../../components/dashboard/assessments-overview";
import {
  NewUserTrendChart,
  UserEngagementChart,
} from "../../components/dashboard/charts";
import { DashboardLayout } from "../../components/dashboard/dashboard-layout";
import { DashboardIntro } from "../../components/dashboard/intro";
import { SectionHeader } from "../../components/dashboard/section-header";
import { SocialMediaTable } from "../../components/dashboard/social-media-table";
import { StatCards } from "../../components/dashboard/stat-cards";
import { TotalRevenue } from "../../components/dashboard/total-revenue";

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
                  <select className="rounded-xl border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
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
                  <select className="rounded-xl border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
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
                  <select className="rounded-xl border-0 bg-gray-50 px-3 py-2 text-sm font-normal text-[#302F2E] outline-none focus:outline-none focus:ring-0">
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
