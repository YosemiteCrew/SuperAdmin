import type { InsightDataPoint } from "./crm-features-dropoff";
import type { PendingReviewRow } from "./crm-pending-reviews-approvals";
import type { DeveloperActivityRow } from "../overview/developer-activity-overview";
import type { StatCard } from "./crm-segment-dashboard";

const ICONS = {
  person: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  lightning: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  code: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  barChart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  message: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  alert: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  cube: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  dollar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

export const DEVELOPERS_DATA = {
  statCards: [
    { label: "Registered Developers", value: "175", change: "+14%", trend: "up" as const, icon: ICONS.person },
    { label: "Active Projects", value: "12", change: "+8%", trend: "up" as const, icon: ICONS.lightning },
    { label: "New API Integrations", value: "16", change: "-15%", trend: "down" as const, icon: ICONS.code },
    { label: "Avg API Calls / Day", value: "1,240", change: "+23%", trend: "up" as const, icon: ICONS.barChart },
    { label: "Support Tickets", value: "26", change: "-42%", trend: "down" as const, icon: ICONS.message },
    { label: "Production Errors Logged", value: "7", change: "-37%", trend: "down" as const, icon: ICONS.alert },
    { label: "Sandbox Environments Used", value: "9", change: "-23%", trend: "down" as const, icon: ICONS.cube },
    { label: "Revenue Earned by Devs", value: "$890", change: "+54%", trend: "up" as const, icon: ICONS.dollar },
  ] as StatCard[],
  pendingReviewRows: [
    { projectName: "steven/pet-vitals-api", developer: "Steven Joe", reviewStatus: "Pending QA", submittedOn: "6h ago" },
    { projectName: "julie/whiskr-alerts", developer: "Julie Monroe", reviewStatus: "Awaiting Feedback", submittedOn: "23h ago" },
    { projectName: "rafael/autoremind-bot", developer: "Rafael Ortega", reviewStatus: "Approved", submittedOn: "2d ago" },
  ] as PendingReviewRow[],
  developerActivityRows: [
    { name: "Danny James", projectName: "Pet Vitals API", apiCalls: 459, errors: 4, deployments: 8, lastUpdate: "2h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
    { name: "Floyd Miles", projectName: "Tail Track", apiCalls: 325, errors: 2, deployments: 2, lastUpdate: "12d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
    { name: "Albert Flores", projectName: "Groomsync", apiCalls: 167, errors: 1, deployments: 0, lastUpdate: "27d ago", status: "Inactive", statusColor: "bg-gray-100 text-gray-700" },
    { name: "Wade Warren", projectName: "Whiskr", apiCalls: 451, errors: 2, deployments: 0, lastUpdate: "40d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
    { name: "Darlene Robertson", projectName: "Pawsitively Yours", apiCalls: 246, errors: 1, deployments: 4, lastUpdate: "5h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
  ] as DeveloperActivityRow[],
  mostUsedTools: [
    { label: "API Playground", value: 38, display: "38%" },
    { label: "Template Library", value: 18, display: "18%" },
    { label: "Sandbox Env", value: 14, display: "14%" },
    { label: "Test Data Generator", value: 16, display: "16%" },
    { label: "Webhooks Monitor", value: 11, display: "11%" },
    { label: "Docs & SDK", value: 3, display: "3%" },
  ] as InsightDataPoint[],
  dropOffIndicators: [
    { label: "High Error Rate", value: 38, display: "38%" },
    { label: "No API Calls in Sandbox", value: 18, display: "18%" },
    { label: "No Deployment", value: 14, display: "14%" },
    { label: "Unused Templates", value: 16, display: "16%" },
    { label: "Pending Feedback", value: 11, display: "11%" },
    { label: "Abandoned Project", value: 3, display: "3%" },
  ] as InsightDataPoint[],
};
